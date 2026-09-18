import type { MasterData, Part, PrimeSet, Refinement, Relic, RelicTier } from './types'

/** マスターデータと、そこから組み立てた検索用の索引。読み取り専用。 */
export class Catalog {
  readonly relics: Relic[]
  readonly sets: PrimeSet[]
  readonly parts: Part[]
  readonly generatedAt: string
  readonly categories: string[]
  /** seed のビット位置の最大値 + 1 */
  readonly partSlots: number

  private readonly relicByID = new Map<string, Relic>()
  private readonly partByID = new Map<string, Part>()
  private readonly partByIndex = new Map<number, Part>()
  private readonly setByID = new Map<string, PrimeSet>()
  private readonly relicsByPart = new Map<string, Relic[]>()
  private readonly relicHaystack = new Map<string, string>()
  private readonly setHaystack = new Map<string, string>()

  constructor(data: MasterData) {
    this.relics = data.relics
    this.sets = data.sets
    this.parts = data.parts
    this.generatedAt = data.generatedAt

    for (const part of data.parts) {
      this.partByID.set(part.id, part)
      this.partByIndex.set(part.index, part)
    }
    for (const set of data.sets) this.setByID.set(set.id, set)

    for (const relic of data.relics) {
      this.relicByID.set(relic.id, relic)
      for (const reward of relic.rewards) {
        const list = this.relicsByPart.get(reward.partID)
        if (list) list.push(relic)
        else this.relicsByPart.set(reward.partID, [relic])
      }
      // レリックは「Lith A1」でも、そこから出るパーツ名でも引けるようにする
      this.relicHaystack.set(
        relic.id,
        `${relic.id} ${relic.rewards.map((r) => r.partID).join(' ')}`.toLowerCase(),
      )
    }
    for (const set of data.sets) {
      this.setHaystack.set(set.id, `${set.name} ${set.category}`.toLowerCase())
    }

    this.partSlots = data.parts.reduce((max, p) => Math.max(max, p.index), -1) + 1
    this.categories = [...new Set(data.sets.map((s) => s.category))].sort()
  }

  relic(id: string): Relic | undefined {
    return this.relicByID.get(id)
  }

  part(id: string): Part | undefined {
    return this.partByID.get(id)
  }

  partAt(index: number): Part | undefined {
    return this.partByIndex.get(index)
  }

  set(id: string): PrimeSet | undefined {
    return this.setByID.get(id)
  }

  /** そのパーツが出るレリックを、確率の高い順に返す。 */
  sources(partID: string, refinement: Refinement): { relic: Relic; chance: number }[] {
    const relics = this.relicsByPart.get(partID) ?? []
    return relics
      .map((relic) => ({
        relic,
        chance: relic.rewards.find((r) => r.partID === partID)?.chance[refinement] ?? 0,
      }))
      .sort((a, b) => b.chance - a.chance)
  }

  /** セットのパーツ。設計図を先頭に、あとは名前順。 */
  partsOf(set: PrimeSet): Part[] {
    return set.partIDs
      .map((id) => this.partByID.get(id))
      .filter((p): p is Part => p !== undefined)
      .sort((a, b) => {
        const aBP = a.shortName === 'Blueprint'
        const bBP = b.shortName === 'Blueprint'
        if (aBP !== bBP) return aBP ? -1 : 1
        return a.shortName.localeCompare(b.shortName)
      })
  }

  searchRelics(query: string, tier: RelicTier | null, vaultedOnly: boolean): Relic[] {
    const needle = query.trim().toLowerCase()
    return this.relics.filter((relic) => {
      if (tier && relic.tier !== tier) return false
      if (vaultedOnly && !relic.vaulted) return false
      if (!needle) return true
      return this.relicHaystack.get(relic.id)?.includes(needle) ?? false
    })
  }

  searchSets(query: string, category: string | null, vaultedOnly: boolean): PrimeSet[] {
    const needle = query.trim().toLowerCase()
    return this.sets.filter((set) => {
      if (category && set.category !== category) return false
      if (vaultedOnly && !set.vaulted) return false
      if (!needle) return true
      return this.setHaystack.get(set.id)?.includes(needle) ?? false
    })
  }

  searchParts(query: string): Part[] {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return this.parts
      .filter((p) => p.id.toLowerCase().includes(needle))
      .sort((a, b) => a.id.localeCompare(b.id))
  }
}

export async function loadCatalog(): Promise<Catalog> {
  const res = await fetch(`${import.meta.env.BASE_URL}warframe_data.json`)
  if (!res.ok) throw new Error(`マスターデータを読み込めませんでした (HTTP ${res.status})`)
  return new Catalog((await res.json()) as MasterData)
}
