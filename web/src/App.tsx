import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Catalog, loadCatalog } from './data/catalog'
import { NOT_OWNED, type Part, type Status } from './data/types'
import { loadCollection, saveCollection, withStatus } from './state/collection'
import { encodeSeed, type StatusMap } from './state/seed'
import { loadMyName, saveMyName, type Member } from './state/members'
import { generateRoomCode, joinRoom, type RoomHandle } from './state/sync'
import { loadSquad, saveSquad, toggleSquad } from './state/squad'
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
  const [members, setMembers] = useState<Member[]>([])
  const [myName, setMyName] = useState(loadMyName)
  const [squadIDs, setSquadIDs] = useState<string[]>(loadSquad)
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
  useEffect(() => saveMyName(myName), [myName])
  useEffect(() => saveSquad(squadIDs), [squadIDs])

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
      onMembers: setMembers,
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
    setMembers([])
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

  // タブと階層ごとにスクロール位置を覚えておく。
  // 覚えないと、別のタブに移ったときに前のタブの位置のままになってしまう。
  const scrollPositions = useRef<Record<string, number>>({})
  const scrollKey = `${tab}:${stacks[tab].length}`

  // 画面を切り替えた「後」に控えると、中身の高さが変わってブラウザが勝手に
  // スクロール位置を詰めた後の値を拾ってしまう。だからスクロールのたびに控える。
  useEffect(() => {
    const remember = () => {
      scrollPositions.current[scrollKey] = window.scrollY
    }
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [scrollKey])

  useLayoutEffect(() => {
    const target = scrollPositions.current[scrollKey] ?? 0
    window.scrollTo(0, target)
    // 中身の高さが決まりきる前だと戻しきれないことがあるので、次のフレームでもう一度合わせる
    const frame = requestAnimationFrame(() => window.scrollTo(0, target))
    return () => cancelAnimationFrame(frame)
  }, [scrollKey])

  // 分隊を選んでいればその人たちだけを見る。選んでいなければ全員。
  const squad = useMemo(() => {
    const picked = squadIDs.map((id) => members.find((m) => m.id === id)).filter((m): m is Member => !!m)
    return picked.length > 0 ? picked : members
  }, [members, squadIDs])


  const context = useMemo(
    () => (catalog ? { catalog, states, setStatus, setMany, members, squad, push } : null),
    [catalog, states, setStatus, setMany, members, squad, push],
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

  const detail = (() => {
    if (!route) return null
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
  })()

  const rootScreen = (() => {
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
            members={members}
            squadIDs={squadIDs}
            onToggleSquad={(id) => setSquadIDs((current) => toggleSquad(current, id))}
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
        {/* 一覧は詳細を開いても外さない。外すと検索や絞り込みが消えてしまう */}
        <div style={{ display: detail ? 'none' : 'contents' }}>{rootScreen}</div>
        {detail}
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
