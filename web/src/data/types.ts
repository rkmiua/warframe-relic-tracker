export type RelicTier = 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem' | 'Vanguard'
export type Rarity = 'Common' | 'Uncommon' | 'Rare'
export type Refinement = 'intact' | 'exceptional' | 'flawless' | 'radiant'

export const REFINEMENTS: Refinement[] = ['intact', 'exceptional', 'flawless', 'radiant']
export const REFINEMENT_LABELS: Record<Refinement, string> = {
  intact: 'Intact',
  exceptional: 'Exceptional',
  flawless: 'Flawless',
  radiant: 'Radiant',
}
export const TIERS: RelicTier[] = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Vanguard']

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

/** 未所持 → 所持中 → 作成済み の 3 状態。数値は seed にそのまま入る。 */
export const NOT_OWNED = 0
export const OWNED = 1
export const CRAFTED = 2
export type Status = typeof NOT_OWNED | typeof OWNED | typeof CRAFTED

export const STATUS_LABELS: Record<Status, string> = {
  [NOT_OWNED]: '未所持',
  [OWNED]: '所持中',
  [CRAFTED]: '作成済み',
}

export function nextStatus(status: Status): Status {
  return status === NOT_OWNED ? OWNED : status === OWNED ? CRAFTED : NOT_OWNED
}
