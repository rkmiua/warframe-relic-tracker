import { describe, expect, test } from 'vitest'
import { decodeSeed, encodeSeed, type StatusMap } from './seed'
import { CRAFTED, NOT_OWNED, OWNED_ONE, OWNED_TWO, type Status } from '../data/types'

const SLOTS = 596

function sample(entries: [number, Status][]): StatusMap {
  return new Map(entries)
}

describe('seed', () => {
  test('往復しても中身が変わらない', async () => {
    const states = sample([
      [0, CRAFTED],
      [1, OWNED_ONE],
      [37, CRAFTED],
      [595, OWNED_TWO],
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

  test('4 段階が混ざっても取り違えない', async () => {
    const states: StatusMap = new Map()
    for (let i = 0; i < SLOTS; i++) {
      const s = (i % 4) as Status
      if (s !== NOT_OWNED) states.set(i, s)
    }
    const { states: back } = await decodeSeed(await encodeSeed(states, SLOTS))
    for (let i = 0; i < SLOTS; i++) {
      expect(back.get(i) ?? NOT_OWNED).toBe((i % 4) as Status)
    }
  })

  test('前の版で書いたものも読める（2 = 作成済み として扱う）', async () => {
    // v1 形式を手で組み立てる: [version=1][slots lo][slots hi][2 ビットずつ]
    const slots = 8
    const bytes = new Uint8Array(3 + 2)
    bytes[0] = 1
    bytes[1] = slots & 0xff
    bytes[2] = 0
    bytes[3] = 0b00001001 // 0 番目 = 1（所持）, 1 番目 = 2（旧・作成済み）
    const base64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const { states } = await decodeSeed(`RV1U.${base64}`)
    expect(states.get(0)).toBe(OWNED_ONE)
    expect(states.get(1)).toBe(CRAFTED)
  })

  test('未所持は持ち回らない', async () => {
    const { states } = await decodeSeed(await encodeSeed(new Map(), SLOTS))
    expect(states.size).toBe(0)
  })

  test('疎な状態なら十分小さい', async () => {
    const states = sample([[10, CRAFTED], [200, OWNED_ONE]])
    const seed = await encodeSeed(states, SLOTS)
    expect(seed.length).toBeLessThan(120)
  })

  test('相手のデータが古くても共通部分は読める', async () => {
    // 相手は 300 パーツ時代のデータで共有してきた、という状況
    const states = sample([[5, CRAFTED], [299, OWNED_ONE]])
    const { states: back, slots } = await decodeSeed(await encodeSeed(states, 300))
    expect(slots).toBe(300)
    expect(back.get(5)).toBe(CRAFTED)
    expect(back.get(299)).toBe(OWNED_ONE)
  })

  test('範囲外のパーツ番号は捨てる', async () => {
    const states = sample([[5, CRAFTED], [9999, CRAFTED]])
    const { states: back } = await decodeSeed(await encodeSeed(states, SLOTS))
    expect(back.has(5)).toBe(true)
    expect(back.has(9999)).toBe(false)
  })

  test('壊れたデータは理由の分かるエラーになる', async () => {
    await expect(decodeSeed('こんにちは')).rejects.toThrow('形式が違います')
    await expect(decodeSeed('XX1.abcd')).rejects.toThrow('別のアプリ')
    await expect(decodeSeed('RV1C.@@@@')).rejects.toThrow()
  })
})
