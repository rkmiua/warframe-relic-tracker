import type { Catalog } from '../data/catalog'
import { CRAFTED, NOT_OWNED, ownedCount, stillNeeded, type Part, type Relic, type Status } from '../data/types'
import type { StatusMap } from './seed'

const STORAGE_KEY = 'relic-vault.collection.v1'
const UPDATED_KEY = 'relic-vault.collection.updatedAt.v1'

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
      if (status > NOT_OWNED && status <= CRAFTED) states.set(index, status as Status)
    }
    return states
  } catch {
    return new Map()
  }
}

export function saveCollection(states: StatusMap, updatedAt: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...states]))
    localStorage.setItem(UPDATED_KEY, String(updatedAt))
  } catch {
    // プライベートブラウズなどで書けなくても、その場の操作は続けられるようにする
  }
}

/** この端末で最後に変更した時刻。端末間でどちらが新しいかを決めるのに使う。 */
export function loadUpdatedAt(): number {
  try {
    const raw = localStorage.getItem(UPDATED_KEY)
    const value = raw === null ? 0 : Number(raw)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
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
    const part = catalog.part(id)
    if (!part) continue
    const status = statusOf(states, part)
    if (status === CRAFTED) crafted++
    // 必要数に届いていなくても、1 個でも持っていれば「所持中」に数える
    else if (ownedCount(status, part.required) > 0) owned++
  }
  return { crafted, owned, total: partIDs.length }
}

export const collected = (p: Progress) => p.crafted + p.owned
export const isComplete = (p: Progress) => p.total > 0 && p.crafted === p.total
export const fractionOf = (p: Progress) => (p.total === 0 ? 0 : p.crafted / p.total)


/**
 * そのレリックに「まだ誰も手をつけていない報酬」が入っているか。
 *
 * 自分も分隊の全員も 1 個も持っていない報酬のこと。
 * みんなで開ければ誰が引いても無駄にならないので、回す相手を決めるのに使う。
 *
 * Forma や Kuva のようにセットに属さない報酬は数えない。
 * 消耗品なので常に未所持になり、数えると全レリックが該当してしまう。
 */
export function untouchedRewardCount(
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): number {
  return relic.rewards.filter((reward) => {
    const part = catalog.part(reward.partID)
    if (!part || !part.setID) return false
    if (statusOf(mine, part) !== NOT_OWNED) return false
    return squad.every((member) => statusOf(member.states, part) === NOT_OWNED)
  }).length
}

export function hasUntouchedReward(
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): boolean {
  return untouchedRewardCount(relic, catalog, mine, squad) > 0
}

/** そのパーツがまだ足りているか（個数まで見る）。 */
export function needsMore(states: StatusMap, part: Part): boolean {
  return stillNeeded(statusOf(states, part), part.required)
}

/**
 * そのレリックに「分隊の誰か（自分を含む）がまだ足りていない報酬」が何個あるか。
 *
 * 全員未所持より広い条件で、1 人でも必要としていれば数える。
 * 2 個要るパーツは、1 個しか持っていなければ「まだ足りていない」とみなす。
 */
export function anyoneNeedsCount(
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): number {
  return relic.rewards.filter((reward) => {
    const part = catalog.part(reward.partID)
    if (!part || !part.setID) return false
    if (needsMore(mine, part)) return true
    return squad.some((member) => needsMore(member.states, part))
  }).length
}

export function hasAnyoneNeeding(
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): boolean {
  return anyoneNeedsCount(relic, catalog, mine, squad) > 0
}
