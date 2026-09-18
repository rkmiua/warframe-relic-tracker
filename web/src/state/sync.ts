import type { Member } from './members'
import { decodeSeed, type StatusMap } from './seed'
import { loadFirebaseConfig } from './firebaseConfig'

/** 紛らわしい文字（0/O、1/I）を除いたルームコード用の文字。 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}

export function isValidRoomCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c))
}

export interface RoomHandle {
  /** 自分の最新状態を送る。 */
  publish: (name: string, seed: string) => Promise<void>
  /** 購読をやめる。 */
  leave: () => void
  myID: string
}

export interface RoomCallbacks {
  onMembers: (members: Member[]) => void
  onError: (message: string) => void
}

/**
 * ルームに参加して、他の人の状態を受け取り続ける。
 *
 * Firebase SDK は設定があるときだけ読み込む（未設定なら通信もバンドルの読み込みも起きない）。
 */
export async function joinRoom(code: string, callbacks: RoomCallbacks): Promise<RoomHandle> {
  const config = loadFirebaseConfig()
  if (!config) throw new Error('Firebase の設定がありません')

  const [{ initializeApp, getApps }, { getAuth, signInAnonymously }, firestore] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } = firestore

  const app = getApps()[0] ?? initializeApp(config)
  const auth = getAuth(app)
  const credential = await signInAnonymously(auth)
  const myID = credential.user.uid
  const db = getFirestore(app)

  const membersRef = collection(db, 'rooms', code, 'members')
  const myRef = doc(membersRef, myID)

  const unsubscribe = onSnapshot(
    membersRef,
    (snapshot) => {
      void (async () => {
        const members: Member[] = []
        for (const document of snapshot.docs) {
          if (document.id === myID) continue // 自分は members に混ぜない
          const data = document.data() as { name?: unknown; seed?: unknown; updatedAt?: unknown }
          if (typeof data.seed !== 'string') continue
          let states: StatusMap
          try {
            states = (await decodeSeed(data.seed)).states
          } catch {
            continue // 壊れた行は黙って飛ばす
          }
          members.push({
            id: document.id,
            name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : '名無し',
            states,
            updatedAt:
              data.updatedAt && typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt
                ? (data.updatedAt as { seconds: number }).seconds * 1000
                : 0,
            source: 'room',
          })
        }
        members.sort((a, b) => a.name.localeCompare(b.name))
        callbacks.onMembers(members)
      })()
    },
    (error) => {
      callbacks.onError(
        error.code === 'permission-denied'
          ? 'ルームを読めませんでした。Firestore のルールを確認してください。'
          : `同期に失敗しました: ${error.message}`,
      )
    },
  )

  return {
    myID,
    publish: async (name, seed) => {
      await setDoc(myRef, { name, seed, updatedAt: serverTimestamp() })
    },
    leave: () => {
      unsubscribe()
      // 抜けたら自分の行は残さない
      void deleteDoc(myRef).catch(() => undefined)
    },
  }
}
