import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Catalog, loadCatalog } from './data/catalog'
import { NOT_OWNED, type Part, type Status } from './data/types'
import { loadCollection, saveCollection, withStatus } from './state/collection'
import { decodeSeed, encodeSeed, type StatusMap } from './state/seed'
import { loadMembers, loadMyName, saveMembers, saveMyName, type Member } from './state/members'
import { generateRoomCode, joinRoom, type RoomHandle } from './state/sync'
import { AppContext, type Route } from './ui/context'
import { BoxIcon, GridIcon, PeopleIcon, SearchIcon } from './ui/icons'
import { Empty } from './ui/components'
import { RelicDetailScreen, RelicListScreen } from './ui/RelicScreens'
import { SetDetailScreen, SetListScreen } from './ui/SetScreens'
import { PartDetailScreen, PartSearchScreen } from './ui/PartScreens'
import { FriendsScreen } from './ui/FriendsScreen'

type Tab = 'relics' | 'sets' | 'search' | 'friends'

const TABS: { id: Tab; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'relics', label: 'レリック', icon: BoxIcon },
  { id: 'sets', label: 'Prime', icon: GridIcon },
  { id: 'search', label: '検索', icon: SearchIcon },
  { id: 'friends', label: 'フレンド', icon: PeopleIcon },
]

const ROOM_KEY = 'relic-vault.room.v1'

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [states, setStates] = useState<StatusMap>(loadCollection)
  const [seedMembers, setSeedMembers] = useState<Member[]>(loadMembers)
  const [roomMembers, setRoomMembers] = useState<Member[]>([])
  const [myName, setMyName] = useState(loadMyName)
  const [mySeed, setMySeed] = useState('')

  const [room, setRoom] = useState<{ code: string; handle: RoomHandle } | null>(null)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const [tab, setTab] = useState<Tab>('relics')
  const [stacks, setStacks] = useState<Record<Tab, Route[]>>({
    relics: [],
    sets: [],
    search: [],
    friends: [],
  })

  useEffect(() => {
    loadCatalog().then(setCatalog, (error: unknown) =>
      setLoadError(error instanceof Error ? error.message : String(error)),
    )
  }, [])

  useEffect(() => saveCollection(states), [states])
  useEffect(() => saveMembers(seedMembers), [seedMembers])
  useEffect(() => saveMyName(myName), [myName])

  // 自分の共有コードは、状態が変わるたびに作り直す
  useEffect(() => {
    if (!catalog) return
    let cancelled = false
    void encodeSeed(states, catalog.partSlots).then((seed) => {
      if (!cancelled) setMySeed(seed)
    })
    return () => {
      cancelled = true
    }
  }, [catalog, states])

  // ルームに入っている間は、自分の状態をまとめて送る
  useEffect(() => {
    if (!room || !mySeed) return
    const timer = setTimeout(() => {
      void room.handle.publish(myName.trim() || '名無し', mySeed).catch(() => {
        setRoomError('自分の状況を送れませんでした')
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [room, mySeed, myName])

  const connect = useCallback((code: string) => {
    setConnecting(true)
    setRoomError(null)
    joinRoom(code, {
      onMembers: setRoomMembers,
      onError: setRoomError,
    }).then(
      (handle) => {
        setRoom({ code, handle })
        setConnecting(false)
        try {
          localStorage.setItem(ROOM_KEY, code)
        } catch {
          // 無視
        }
      },
      (error: unknown) => {
        setConnecting(false)
        setRoomError(error instanceof Error ? error.message : 'ルームに参加できませんでした')
      },
    )
  }, [])

  // 前に入っていたルームには自動で戻る
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(ROOM_KEY)
    } catch {
      saved = null
    }
    if (saved) connect(saved)
  }, [connect])

  const leaveRoom = useCallback(() => {
    room?.handle.leave()
    setRoom(null)
    setRoomMembers([])
    setRoomError(null)
    try {
      localStorage.removeItem(ROOM_KEY)
    } catch {
      // 無視
    }
  }, [room])

  const setStatus = useCallback((part: Part, status: Status) => {
    setStates((current) => withStatus(current, part, status))
  }, [])

  const setMany = useCallback(
    (partIDs: string[], status: Status) => {
      if (!catalog) return
      setStates((current) => {
        const next = new Map(current)
        for (const id of partIDs) {
          const part = catalog.part(id)
          if (!part) continue
          if (status === NOT_OWNED) next.delete(part.index)
          else next.set(part.index, status)
        }
        return next
      })
    },
    [catalog],
  )

  const push = useCallback(
    (route: Route) => setStacks((current) => ({ ...current, [tab]: [...current[tab], route] })),
    [tab],
  )
  const pop = useCallback(
    () => setStacks((current) => ({ ...current, [tab]: current[tab].slice(0, -1) })),
    [tab],
  )

  const members = useMemo(() => [...roomMembers, ...seedMembers], [roomMembers, seedMembers])

  const importSeed = useCallback(async (seed: string, name: string) => {
    const { states: imported } = await decodeSeed(seed)
    setSeedMembers((current) => [
      ...current.filter((m) => m.name !== name),
      { id: `seed-${Date.now()}`, name, states: imported, updatedAt: Date.now(), source: 'seed' },
    ])
  }, [])

  const context = useMemo(
    () => (catalog ? { catalog, states, setStatus, setMany, members, push } : null),
    [catalog, states, setStatus, setMany, members, push],
  )

  if (loadError) {
    return (
      <div className="app">
        <Empty title="データを読み込めませんでした" description={loadError} />
      </div>
    )
  }
  if (!catalog || !context) {
    return (
      <div className="app">
        <div className="empty">読み込んでいます…</div>
      </div>
    )
  }

  const stack = stacks[tab]
  const route = stack[stack.length - 1]

  const screen = (() => {
    if (route) {
      switch (route.kind) {
        case 'relic': {
          const relic = catalog.relic(route.id)
          return relic ? <RelicDetailScreen relic={relic} onBack={pop} /> : null
        }
        case 'set': {
          const set = catalog.set(route.id)
          return set ? <SetDetailScreen set={set} onBack={pop} /> : null
        }
        case 'part': {
          const part = catalog.part(route.id)
          return part ? <PartDetailScreen part={part} onBack={pop} /> : null
        }
      }
    }
    switch (tab) {
      case 'relics':
        return <RelicListScreen />
      case 'sets':
        return <SetListScreen />
      case 'search':
        return <PartSearchScreen />
      case 'friends':
        return (
          <FriendsScreen
            myName={myName}
            onChangeName={setMyName}
            mySeed={mySeed}
            members={members}
            onImportSeed={importSeed}
            onRemoveMember={(id) => setSeedMembers((current) => current.filter((m) => m.id !== id))}
            roomCode={room?.code ?? null}
            roomError={roomError}
            connecting={connecting}
            onJoinRoom={connect}
            onLeaveRoom={leaveRoom}
            onCreateRoom={() => connect(generateRoomCode())}
          />
        )
    }
  })()

  return (
    <AppContext.Provider value={context}>
      <div className="app">
        {screen}
        <nav className="tabbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-selected={tab === id}
              onClick={() => {
                // 選択中のタブをもう一度押したら、そのタブの階層を戻す
                if (tab === id) setStacks((current) => ({ ...current, [id]: [] }))
                else setTab(id)
              }}
            >
              <span className="glyph">
                <Icon />
              </span>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </AppContext.Provider>
  )
}
