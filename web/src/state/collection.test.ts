import { describe, expect, test } from 'vitest'
import { Catalog } from '../data/catalog'
import { anyoneNeedsCount, untouchedRewardCount } from './collection'
import type { StatusMap } from './seed'
import {
  CRAFTED,
  NOT_OWNED,
  OWNED_ONE,
  OWNED_TWO,
  type MasterData,
  type Status,
} from '../data/types'

// 1 個要るパーツ・2 個要るパーツ・Forma を 1 つずつ持つレリックを組み立てる
const DATA: MasterData = {
  version: 1,
  generatedAt: '2026-09-18',
  relics: [
    {
      id: 'Lith T1',
      tier: 'Lith',
      code: 'T1',
      vaulted: false,
      rewards: [
        { partID: 'Test Prime Blueprint', rarity: 'Rare', chance: { intact: 2 } },
        { partID: 'Test Prime Barrel', rarity: 'Uncommon', chance: { intact: 11 } },
        { partID: 'Forma Blueprint', rarity: 'Common', chance: { intact: 25 } },
      ],
    },
  ],
  sets: [
    {
      id: 'Test Prime',
      name: 'Test Prime',
      category: 'Primary',
      vaulted: false,
      partIDs: ['Test Prime Blueprint', 'Test Prime Barrel'],
    },
  ],
  parts: [
    { id: 'Test Prime Blueprint', name: 'Test Prime Blueprint', shortName: 'Blueprint', setID: 'Test Prime', required: 1, index: 0 },
    // これが 1 セットに 2 個要るパーツ
    { id: 'Test Prime Barrel', name: 'Test Prime Barrel', shortName: 'Barrel', setID: 'Test Prime', required: 2, index: 1 },
    { id: 'Forma Blueprint', name: 'Forma Blueprint', shortName: 'Forma Blueprint', setID: null, required: 1, index: 2 },
  ],
}

const catalog = new Catalog(DATA)
const relic = catalog.relic('Lith T1')!
const BLUEPRINT = 0
const BARREL = 1

const states = (entries: [number, Status][]): StatusMap => new Map(entries)
const member = (entries: [number, Status][]) => ({ states: states(entries) })

describe('全員未所持（untouchedRewardCount）', () => {
  test('誰も 1 個も持っていなければ、×2 のパーツも数える', () => {
    expect(untouchedRewardCount(relic, catalog, states([]), [member([])])).toBe(2)
  })

  test('×2 のパーツを自分が 1 個持っていたら、そのパーツは数えない', () => {
    const count = untouchedRewardCount(relic, catalog, states([[BARREL, OWNED_ONE]]), [member([])])
    expect(count).toBe(1) // 設計図だけ
  })

  test('×2 のパーツを相手が 1 個持っていても、そのパーツは数えない', () => {
    const count = untouchedRewardCount(relic, catalog, states([]), [member([[BARREL, OWNED_ONE]])])
    expect(count).toBe(1)
  })

  test('Forma は数えない', () => {
    const count = untouchedRewardCount(relic, catalog, states([[BLUEPRINT, CRAFTED], [BARREL, CRAFTED]]), [
      member([[BLUEPRINT, CRAFTED], [BARREL, CRAFTED]]),
    ])
    expect(count).toBe(0)
  })
})

describe('誰かが未所持（anyoneNeedsCount）', () => {
  test('×2 のパーツを 1 個しか持っていなければ、まだ足りていないと数える', () => {
    const count = anyoneNeedsCount(relic, catalog, states([[BLUEPRINT, CRAFTED], [BARREL, OWNED_ONE]]), [
      member([[BLUEPRINT, CRAFTED], [BARREL, CRAFTED]]),
    ])
    expect(count).toBe(1) // Barrel があと 1 個要る
  })

  test('×2 のパーツを 2 個持っていれば、足りているとみなす', () => {
    const count = anyoneNeedsCount(relic, catalog, states([[BLUEPRINT, CRAFTED], [BARREL, OWNED_TWO]]), [
      member([[BLUEPRINT, CRAFTED], [BARREL, OWNED_TWO]]),
    ])
    expect(count).toBe(0)
  })

  test('相手が 1 個しか持っていなければ、こちらが揃っていても数える', () => {
    const count = anyoneNeedsCount(relic, catalog, states([[BLUEPRINT, CRAFTED], [BARREL, CRAFTED]]), [
      member([[BLUEPRINT, CRAFTED], [BARREL, OWNED_ONE]]),
    ])
    expect(count).toBe(1)
  })

  test('相手を指定しなければ、自分だけを見る', () => {
    const count = anyoneNeedsCount(relic, catalog, states([[BLUEPRINT, CRAFTED], [BARREL, OWNED_ONE]]), [])
    expect(count).toBe(1)
  })

  test('全員が作成済みなら 0', () => {
    const done = states([[BLUEPRINT, CRAFTED], [BARREL, CRAFTED]])
    expect(anyoneNeedsCount(relic, catalog, done, [{ states: done }])).toBe(0)
  })
})

describe('二つの絞り込みの関係', () => {
  test('全員未所持は、誰かが未所持に含まれる', () => {
    const mine = states([[BARREL, OWNED_ONE]])
    const squad = [member([])]
    const untouched = untouchedRewardCount(relic, catalog, mine, squad)
    const anyone = anyoneNeedsCount(relic, catalog, mine, squad)
    expect(untouched).toBeLessThanOrEqual(anyone)
    // Barrel は「全員未所持」ではないが、まだ足りていないので「誰かが未所持」には入る
    expect(untouched).toBe(1)
    expect(anyone).toBe(2)
  })
})
