/**
 * Firebase の接続設定。
 *
 * ビルド時の環境変数（.env.local）を使うほか、画面から貼り付けたものも使える。
 * この値は公開されて構わないもので、実際の保護は Firestore のルール（firestore.rules）で行う。
 */
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

const STORAGE_KEY = 'relic-vault.firebase.v1'

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const

function fromEnv(): FirebaseConfig | null {
  const env = import.meta.env
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  return REQUIRED_KEYS.every((k) => typeof config[k] === 'string' && config[k]) ? (config as FirebaseConfig) : null
}

function fromStorage(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseConfig(raw)
  } catch {
    return null
  }
}

/** Firebase コンソールの設定スニペットをそのまま貼っても読めるようにする。 */
export function parseConfig(text: string): FirebaseConfig | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const pick = (key: string): string | undefined => {
    const m = trimmed.match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`))
    return m?.[1]
  }

  const config = {
    apiKey: pick('apiKey'),
    authDomain: pick('authDomain'),
    projectId: pick('projectId'),
    appId: pick('appId'),
  }
  if (REQUIRED_KEYS.every((k) => config[k])) return config as FirebaseConfig

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (REQUIRED_KEYS.every((k) => typeof obj[k] === 'string' && obj[k])) {
        return {
          apiKey: obj.apiKey as string,
          authDomain: obj.authDomain as string,
          projectId: obj.projectId as string,
          appId: obj.appId as string,
        }
      }
    }
  } catch {
    // JSON でなければ諦める
  }
  return null
}

export function loadFirebaseConfig(): FirebaseConfig | null {
  return fromEnv() ?? fromStorage()
}

export function saveFirebaseConfig(config: FirebaseConfig | null): void {
  try {
    if (config) localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 無視
  }
}

export function isConfiguredByEnv(): boolean {
  return fromEnv() !== null
}
