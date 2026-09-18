import type { StatusMap } from './seed'
import { CRAFTED, OWNED } from '../data/types'

/** 自分以外の誰か。seed を貼って取り込んだ人と、同じルームにいる人。 */
export interface Member {
  id: string
  name: string
  states: StatusMap
  updatedAt: number
  source: 'seed' | 'room'
}

const STORAGE_KEY = 'relic-vault.members.v1'

interface StoredMember {
  id: string
  name: string
  states: [number, number][]
  updatedAt: number
  source: string
}

export function loadMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry): Member[] => {
      const m = entry as Partial<StoredMember>
      if (typeof m.id !== 'string' || typeof m.name !== 'string' || !Array.isArray(m.states)) return []
      const states: StatusMap = new Map()
      for (const pair of m.states) {
        if (!Array.isArray(pair) || pair.length !== 2) continue
        const [index, status] = pair
        if (typeof index !== 'number') continue
        if (status === OWNED || status === CRAFTED) states.set(index, status)
      }
      return [{
        id: m.id,
        name: m.name,
        states,
        updatedAt: typeof m.updatedAt === 'number' ? m.updatedAt : 0,
        source: m.source === 'room' ? 'room' : 'seed',
      }]
    })
  } catch {
    return []
  }
}

export function saveMembers(members: Member[]): void {
  try {
    // ルーム側の人は毎回サーバーから来るので、保存するのは seed で取り込んだ人だけ
    const stored: StoredMember[] = members
      .filter((m) => m.source === 'seed')
      .map((m) => ({ id: m.id, name: m.name, states: [...m.states], updatedAt: m.updatedAt, source: m.source }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // 保存できなくても操作は続けられる
  }
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
    // 無視
  }
}
