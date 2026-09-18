import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { loadFirebaseConfig } from './firebaseConfig'

export interface FirebaseBundle {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let cached: Promise<FirebaseBundle> | null = null

/**
 * Firebase を必要になったときだけ読み込む。
 * 設定がなければ何も読み込まないので、使わない人には通信もダウンロードも起きない。
 */
export function getFirebase(): Promise<FirebaseBundle> {
  if (cached) return cached
  cached = (async () => {
    const config = loadFirebaseConfig()
    if (!config) throw new Error('Firebase の設定がありません')
    const [{ initializeApp, getApps }, { getAuth }, { getFirestore }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])
    const app = getApps()[0] ?? initializeApp(config)
    return { app, auth: getAuth(app), db: getFirestore(app) }
  })()
  return cached
}

export interface Account {
  uid: string
  /** Google でログインしていれば表示名、匿名なら null */
  name: string | null
  isAnonymous: boolean
}

function toAccount(user: User): Account {
  return { uid: user.uid, name: user.displayName, isAnonymous: user.isAnonymous }
}

/**
 * ログイン状態を見張る。
 * 誰でもないときは匿名でサインインするので、フレンドはアカウントを作らずに使える。
 */
export async function watchAccount(onChange: (account: Account | null) => void): Promise<() => void> {
  const { auth } = await getFirebase()
  // onAuthStateChanged だと、匿名アカウントを Google に結び付けたときに呼ばれない
  // （サインインし直したわけではないため）。トークンの変化を見れば結合でも呼ばれる。
  const { onIdTokenChanged, signInAnonymously } = await import('firebase/auth')
  return onIdTokenChanged(auth, (user) => {
    if (user) {
      onChange(toAccount(user))
    } else {
      onChange(null)
      void signInAnonymously(auth).catch(() => undefined)
    }
  })
}

/**
 * Google でログインする。
 *
 * すでに匿名で使っていた場合は、その匿名アカウントを Google に結びつけるので
 * これまで記録した内容はそのまま引き継がれる。
 * 別の端末で先に同じ Google アカウントを使っていたときは結びつけられないので、
 * 先にあるアカウントの方へサインインし直す（そちらのデータが正となる）。
 */
export async function signInWithGoogle(): Promise<{ account: Account; keptLocalData: boolean }> {
  const { auth } = await getFirebase()
  const { GoogleAuthProvider, linkWithPopup, signInWithPopup } = await import('firebase/auth')
  const provider = new GoogleAuthProvider()

  const current = auth.currentUser
  if (current?.isAnonymous) {
    try {
      const credential = await linkWithPopup(current, provider)
      return { account: toAccount(credential.user), keptLocalData: true }
    } catch (error) {
      const code = (error as { code?: string }).code
      const alreadyUsed =
        code === 'auth/credential-already-in-use' ||
        code === 'auth/email-already-in-use' ||
        code === 'auth/account-exists-with-different-credential'
      if (!alreadyUsed) throw error
      // すでにそのアカウントが使われている = 別の端末で先に作ってある。そちらへ入る。
      const credential = await signInWithPopup(auth, provider)
      return { account: toAccount(credential.user), keptLocalData: false }
    }
  }

  const credential = await signInWithPopup(auth, provider)
  return { account: toAccount(credential.user), keptLocalData: false }
}

/** ログアウトすると、また匿名の誰かとして扱われる。 */
export async function signOutAccount(): Promise<void> {
  const { auth } = await getFirebase()
  const { signOut } = await import('firebase/auth')
  await signOut(auth)
}

export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string }).code ?? ''
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ログインを中断しました'
    case 'auth/popup-blocked':
      return 'ポップアップがブロックされました。ブラウザの設定を確認してください'
    case 'auth/operation-not-allowed':
      return 'Firebase コンソールで Google ログインが有効になっていません'
    case 'auth/unauthorized-domain':
      return 'このドメインが Firebase の承認済みドメインに入っていません'
    default:
      return error instanceof Error ? error.message : 'ログインに失敗しました'
  }
}
