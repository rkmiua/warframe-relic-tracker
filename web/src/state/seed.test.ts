import { describe, expect, test } from 'vitest'
import { decodeSeed, encodeSeed, type StatusMap } from './seed'
import { CRAFTED, NOT_OWNED, OWNED, type Status } from '../data/types'

const SLOTS = 596

function sample(entries: [number, Status][]): StatusMap {
  return new Map(entries)
}

describe('seed', () => {
  test('往復しても中身が変わらない', async () => {
    const states = sample([
      [0, CRAFTED],
      [1, OWNED],
      [37, CRAFTED],
      [595, OWNED],
    ])
    const { states: back, slots } = await decodeSeed(await encodeSeed(states, SLOTS))
    expect(slots).toBe(SLOTS)
    expect([...back].sort()).toEqual([...states].sort())
  })

  test('全パーツが作成済みでも往復する', async () => {
    const states: StatusMap = new Map()
    for (let i = 0; i < SLOTS; i++) states.set(i, CRAFTED)
    const { states: back } = await decodeSeed(await encodeSeed(states, SLOTS))
    expect(back.size).toBe(SLOTS)
    expect([...back.values()].every((s) => s === CRAFTED)).toBe(true)
  })

  test('3状態が混ざっても取り違えない', async () => {
    const states: StatusMap = new Map()
    for (let i = 0; i < SLOTS; i++) {
      const s = (i % 3) as Status
      if (s !== NOT_OWNED) states.set(i, s)
    }
    const { states: back } = await decodeSeed(await encodeSeed(states, SLOTS))
    for (let i = 0; i < SLOTS; i++) {
      expect(back.get(i) ?? NOT_OWNED).toBe((i % 3) as Status)
    }
  })

  test('未所持は持ち回らない', async () => {
    const { states } = await decodeSeed(await encodeSeed(new Map(), SLOTS))
    expect(states.size).toBe(0)
  })

  test('疎な状態なら十分短い', async () => {
    const states = sample([[10, CRAFTED], [200, OWNED]])
    const seed = await encodeSeed(states, SLOTS)
    expect(seed.length).toBeLessThan(120)
  })

  test('相手のデータが古くても共通部分は読める', async () => {
    // 相手は 300 パーツ時代のデータで共有してきた、という状況
    const states = sample([[5, CRAFTED], [299, OWNED]])
    const { states: back, slots } = await decodeSeed(await encodeSeed(states, 300))
    expect(slots).toBe(300)
    expect(back.get(5)).toBe(CRAFTED)
    expect(back.get(299)).toBe(OWNED)
  })

  test('範囲外のパーツ番号は捨てる', async () => {
    const states = sample([[5, CRAFTED], [9999, CRAFTED]])
    const { states: back } = await decodeSeed(await encodeSeed(states, SLOTS))
    expect(back.has(5)).toBe(true)
    expect(back.has(9999)).toBe(false)
  })

  test('壊れたコードは理由の分かるエラーになる', async () => {
    await expect(decodeSeed('こんにちは')).rejects.toThrow('形式が違います')
    await expect(decodeSeed('XX1.abcd')).rejects.toThrow('別のアプリ')
    await expect(decodeSeed('RV1C.@@@@')).rejects.toThrow()
  })
})
