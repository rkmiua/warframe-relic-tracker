import { getFirebase } from './firebase'
import { decodeSeed, type StatusMap } from './seed'

/**
 * 自分の所持状況を端末をまたいで持ち回る。
 *
 * ルームは「みんなに見せる場所」、こちらは「自分の端末どうしをつなぐ場所」。
 * Google でログインしていれば iPhone と iPad で同じ uid になるので、同じ行を読み書きする。
 * 匿名のままだと端末ごとに別の uid になるため、同期はされない。
 */
export interface PersonalSync {
  /** 自分の最新を送る。 */
  push: (seed: string, updatedAt: number) => Promise<void>
  stop: () => void
}

export interface PersonalSnapshot {
  states: StatusMap
  updatedAt: number
}

/**
 * 自分の行を購読する。相手側が新しければ `onRemote` が呼ばれる。
 * どちらが新しいかは updatedAt で決める（後から書いた方を採用する）。
 */
export async function watchMyData(
  uid: string,
  onRemote: (snapshot: PersonalSnapshot) => void,
  onError: (message: string) => void,
): Promise<PersonalSync> {
  const { db } = await getFirebase()
  const { doc, onSnapshot, setDoc } = await import('firebase/firestore')
  const ref = doc(db, 'users', uid)

  const unsubscribe = onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.data() as { seed?: unknown; updatedAt?: unknown } | undefined
      if (!data || typeof data.seed !== 'string') return
      const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0
      void decodeSeed(data.seed).then(
        ({ states }) => onRemote({ states, updatedAt }),
        () => undefined, // 壊れていたら黙って無視する
      )
    },
    (error) => {
      onError(
        error.code === 'permission-denied'
          ? '自分のデータを読めませんでした。Firestore のルールに users の項目が要ります。'
          : `端末間の同期に失敗しました: ${error.message}`,
      )
    },
  )

  return {
    push: async (seed, updatedAt) => {
      await setDoc(ref, { seed, updatedAt })
    },
    stop: unsubscribe,
  }
}
