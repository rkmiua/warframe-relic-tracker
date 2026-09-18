/** Warframe の分隊は 4 人なので、自分以外に選べるのは 3 人まで。 */
export const SQUAD_LIMIT = 3

const STORAGE_KEY = 'relic-vault.squad.v1'

export function loadSquad(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, SQUAD_LIMIT)
  } catch {
    return []
  }
}

export function saveSquad(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, SQUAD_LIMIT)))
  } catch {
    // 保存できなくてもその場の操作は続けられる
  }
}

/** 選び直す。すでに 3 人いるときに 4 人目を選んだら、いちばん古い人と入れ替える。 */
export function toggleSquad(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  if (ids.length < SQUAD_LIMIT) return [...ids, id]
  return [...ids.slice(1), id]
}
