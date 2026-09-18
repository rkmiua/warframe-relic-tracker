import type { StatusMap } from './seed'

/** 同じルームにいる人。ルームから毎回届くので、こちらでは保存しない。 */
export interface Member {
  id: string
  name: string
  states: StatusMap
  updatedAt: number
}

/** 自分の表示名。ルームで他の人に見える。 */
const NAME_KEY = 'relic-vault.myName.v1'

export function loadMyName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveMyName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // 保存できなくてもその場の操作は続けられる
  }
}
