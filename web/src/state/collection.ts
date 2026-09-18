import type { Catalog } from '../data/catalog'
import { CRAFTED, NOT_OWNED, OWNED, type Part, type Relic, type Status } from '../data/types'
import type { StatusMap } from './seed'

const STORAGE_KEY = 'relic-vault.collection.v1'

/** 自分の所持状態を localStorage に出し入れする。 */
export function loadCollection(): StatusMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Map()
    const states: StatusMap = new Map()
    for (const entry of parsed) {
      if (!Array.isArray(entry) || entry.length !== 2) continue
      const [index, status] = entry as [unknown, unknown]
      if (typeof index !== 'number' || typeof status !== 'number') continue
      if (status === OWNED || status === CRAFTED) states.set(index, status)
    }
    return states
  } catch {
    return new Map()
  }
}

export function saveCollection(states: StatusMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...states]))
  } catch {
    // プライベートブラウズなどで書けなくても、その場の操作は続けられるようにする
  }
}

export function statusOf(states: StatusMap, part: Part | undefined): Status {
  if (!part) return NOT_OWNED
  return states.get(part.index) ?? NOT_OWNED
}

export function withStatus(states: StatusMap, part: Part, status: Status): StatusMap {
  const next = new Map(states)
  if (status === NOT_OWNED) next.delete(part.index)
  else next.set(part.index, status)
  return next
}

export interface Progress {
  crafted: number
  owned: number
  total: number
}

export function progressOf(partIDs: string[], catalog: Catalog, states: StatusMap): Progress {
  let crafted = 0
  let owned = 0
  for (const id of partIDs) {
    const status = statusOf(states, catalog.part(id))
    if (status === CRAFTED) crafted++
    else if (status === OWNED) owned++
  }
  return { crafted, owned, total: partIDs.length }
}

export const collected = (p: Progress) => p.crafted + p.owned
export const isComplete = (p: Progress) => p.total > 0 && p.crafted === p.total
export const fractionOf = (p: Progress) => (p.total === 0 ? 0 : p.crafted / p.total)


/**
 * そのレリックに、自分か分隊の誰かがまだ持っていない報酬が入っているか。
 *
 * Forma や Kuva のようにセットに属さない報酬は数えない。
 * 消耗品なので常に「未所持」になり、これを数えると全レリックが該当してしまう。
 */
export function hasWantedReward(
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): boolean {
  return relic.rewards.some((reward) => {
    const part = catalog.part(reward.partID)
    if (!part || !part.setID) return false
    if (statusOf(mine, part) === NOT_OWNED) return true
    return squad.some((member) => statusOf(member.states, part) === NOT_OWNED)
  })
}

/** そのレリックで、誰か（自分を含む）が欲しがっている報酬の数。 */
export function wantedRewardCount(
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): number {
  return relic.rewards.filter((reward) => {
    const part = catalog.part(reward.partID)
    if (!part || !part.setID) return false
    if (statusOf(mine, part) === NOT_OWNED) return true
    return squad.some((member) => statusOf(member.states, part) === NOT_OWNED)
  }).length
}
