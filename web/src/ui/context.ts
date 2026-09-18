import { createContext, useContext } from 'react'
import type { Catalog } from '../data/catalog'
import type { Part, Status } from '../data/types'
import type { StatusMap } from '../state/seed'
import type { Member } from '../state/members'

export type Route =
  | { kind: 'relic'; id: string }
  | { kind: 'set'; id: string }
  | { kind: 'part'; id: string }

export interface AppContextValue {
  catalog: Catalog
  states: StatusMap
  setStatus: (part: Part, status: Status) => void
  setMany: (partIDs: string[], status: Status) => void
  members: Member[]
  /** 表示に使う相手。分隊を選んでいればその人たち、選んでいなければ members と同じ。 */
  squad: Member[]
  /** ルームに入っているか。人と見比べる機能はこれが真のときだけ出す。 */
  inRoom: boolean
  push: (route: Route) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('AppContext の外で使われています')
  return value
}
