export type RelicTier = 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Vanguard'
export type Rarity = 'Common' | 'Uncommon' | 'Rare'
export type Refinement = 'intact' | 'exceptional' | 'flawless' | 'radiant'

/** 確率は未精錬（Intact）のものだけを見せる。 */
export const BASE_REFINEMENT: Refinement = 'intact'
export const TIERS: RelicTier[] = ['Lith', 'Meso', 'Neo', 'Axi', 'Vanguard']

export interface Reward {
  partID: string
  rarity: Rarity
  chance: Partial<Record<Refinement, number>>
}

export interface Relic {
  id: string
  tier: RelicTier
  code: string
  vaulted: boolean
  rewards: Reward[]
}

export interface PrimeSet {
  id: string
  name: string
  category: string
  vaulted: boolean
  partIDs: string[]
}

export interface Part {
  id: string
  name: string
  shortName: string
  setID: string | null
  required: number
  /** seed のビット位置。一度振ったら変わらない。 */
  index: number
}

export interface MasterData {
  version: number
  generatedAt: string
  relics: Relic[]
  sets: PrimeSet[]
  parts: Part[]
}

/**
 * パーツの持ち具合。数値はそのまま seed のビットに入る（1 パーツ 2 ビット）。
 *
 * 1 セットに 2 個要るパーツ（デュアル武器の Barrel など）があるので、
 * 1 個目と 2 個目を分けて数えられるようにしてある。
 * 1 個しか要らないパーツでは OWNED_TWO は使わない。
 */
export const NOT_OWNED = 0
export const OWNED_ONE = 1
export const OWNED_TWO = 2
export const CRAFTED = 3
export type Status = typeof NOT_OWNED | typeof OWNED_ONE | typeof OWNED_TWO | typeof CRAFTED

/** いま何個持っているか。作成済みは必要数を満たしているものとして扱う。 */
export function ownedCount(status: Status, required: number): number {
  switch (status) {
    case OWNED_ONE:
      return 1
    case OWNED_TWO:
      return 2
    case CRAFTED:
      return required
    default:
      return 0
  }
}

/** まだ足りていないか。 */
export function stillNeeded(status: Status, required: number): boolean {
  return status !== CRAFTED && ownedCount(status, required) < required
}

export function statusLabel(status: Status, required: number): string {
  if (status === CRAFTED) return '作成済み'
  if (status === NOT_OWNED) return '未所持'
  if (required > 1) return `${ownedCount(status, required)} / ${required} 個`
  return '所持中'
}

/** タップするたびに一段ずつ進む。2 個要るパーツは 1 個目・2 個目を挟む。 */
export function nextStatus(status: Status, required: number): Status {
  if (required > 1) {
    switch (status) {
      case NOT_OWNED:
        return OWNED_ONE
      case OWNED_ONE:
        return OWNED_TWO
      case OWNED_TWO:
        return CRAFTED
      default:
        return NOT_OWNED
    }
  }
  switch (status) {
    case NOT_OWNED:
      return OWNED_ONE
    case OWNED_ONE:
      return CRAFTED
    default:
      return NOT_OWNED
  }
}

/** その状態を選べるか（1 個しか要らないパーツで「2 個」は出さない）。 */
export function selectableStatuses(required: number): Status[] {
  return required > 1
    ? [NOT_OWNED, OWNED_ONE, OWNED_TWO, CRAFTED]
    : [NOT_OWNED, OWNED_ONE, CRAFTED]
}
