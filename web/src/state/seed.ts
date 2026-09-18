import { CRAFTED, NOT_OWNED, type Status } from '../data/types'

/** パーツ番号 → 所持状態。未所持は持たない疎なマップ。 */
export type StatusMap = Map<number, Status>

const MAGIC = 'RV1'
const HEADER_BYTES = 3 // [version][slotCount lo][slotCount hi]
// v1 は 0=未所持 / 1=所持 / 2=作成済み だった。
// v2 では 2 個要るパーツを数えられるよう 2=2 個持ち / 3=作成済み に変えている。
const VERSION = 2
const LEGACY_VERSION = 1

/**
 * 所持状態を 1 本の文字列にまとめる。
 *
 * 1 パーツ 2 ビットで詰め、deflate をかけて base64url にする。
 * ほとんどが未所持なので実際には 596 パーツでも数十文字に収まる。
 * 先頭にバージョンとパーツ数を入れてあるので、
 * 相手のデータが古くても共通部分だけ読み取れる。
 */
export async function encodeSeed(states: StatusMap, slots: number): Promise<string> {
  const packed = new Uint8Array(HEADER_BYTES + Math.ceil(slots / 4))
  packed[0] = VERSION
  packed[1] = slots & 0xff
  packed[2] = (slots >> 8) & 0xff

  for (const [index, status] of states) {
    if (status === NOT_OWNED || index < 0 || index >= slots) continue
    const byte = HEADER_BYTES + (index >> 2)
    packed[byte] = (packed[byte] ?? 0) | ((status & 0b11) << ((index & 0b11) * 2))
  }

  const compressed = await deflate(packed)
  // 圧縮して縮まないほど疎なこともあるので、小さい方を選ぶ
  const useRaw = compressed.length >= packed.length
  return `${MAGIC}${useRaw ? 'U' : 'C'}.${toBase64Url(useRaw ? packed : compressed)}`
}

export interface DecodedSeed {
  states: StatusMap
  /** 相手が持っていたパーツ数。こちらより少なければ相手のデータが古い。 */
  slots: number
}

export async function decodeSeed(seed: string): Promise<DecodedSeed> {
  const trimmed = seed.trim()
  const dot = trimmed.indexOf('.')
  if (dot < 0) throw new Error('データの形式が違います')

  const prefix = trimmed.slice(0, dot)
  if (!prefix.startsWith(MAGIC)) {
    throw new Error('別のアプリのデータのようです')
  }
  const mode = prefix.slice(MAGIC.length)
  if (mode !== 'U' && mode !== 'C') throw new Error('データの形式が違います')

  let bytes: Uint8Array
  try {
    bytes = fromBase64Url(trimmed.slice(dot + 1))
  } catch {
    throw new Error('データが壊れています')
  }
  if (mode === 'C') bytes = await inflate(bytes)

  if (bytes.length < HEADER_BYTES) throw new Error('データが壊れています')
  const version = bytes[0]
  if (version !== VERSION && version !== LEGACY_VERSION) {
    throw new Error(`対応していないバージョンです (v${version})`)
  }
  const legacy = version === LEGACY_VERSION
  const slots = (bytes[1] ?? 0) | ((bytes[2] ?? 0) << 8)

  const states: StatusMap = new Map()
  for (let index = 0; index < slots; index++) {
    const byte = bytes[HEADER_BYTES + (index >> 2)]
    if (byte === undefined) break
    let status = ((byte >> ((index & 0b11) * 2)) & 0b11) as Status
    // v1 の「2 = 作成済み」を v2 の 3 に読み替える
    if (legacy && status === 2) status = CRAFTED
    if (status !== NOT_OWNED) states.set(index, status)
  }
  return { states, slots }
}

// --- 圧縮 ---------------------------------------------------------------

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return bytes
  try {
    return await streamThrough(new CompressionStream('deflate-raw'), bytes)
  } catch {
    return bytes // 圧縮できない環境では素のまま送る
  }
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('この環境では圧縮されたデータを読めません')
  }
  return streamThrough(new DecompressionStream('deflate-raw'), bytes)
}

async function streamThrough(
  transform: CompressionStream | DecompressionStream,
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// --- base64url ----------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
