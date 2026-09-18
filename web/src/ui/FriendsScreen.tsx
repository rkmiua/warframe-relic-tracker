import { useEffect, useState } from 'react'
import { Empty, NavBar, Row } from './components'
import { PeopleIcon, StatusIcon } from './icons'
import type { Member } from '../state/members'
import { isValidRoomCode, normalizeRoomCode } from '../state/sync'
import { isConfiguredByEnv, loadFirebaseConfig, parseConfig, saveFirebaseConfig } from '../state/firebaseConfig'
import { SQUAD_LIMIT } from '../state/squad'

export interface FriendsScreenProps {
  myName: string
  onChangeName: (name: string) => void
  members: Member[]
  squadIDs: string[]
  onToggleSquad: (id: string) => void
  roomCode: string | null
  roomError: string | null
  connecting: boolean
  onJoinRoom: (code: string) => void
  onLeaveRoom: () => void
  onCreateRoom: () => void
}

export function FriendsScreen(props: FriendsScreenProps) {
  const [copied, setCopied] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [hasConfig, setHasConfig] = useState(() => loadFirebaseConfig() !== null)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <NavBar title="フレンド" />
      <div className="content">
        <div className="card">
          <h2>自分の表示名</h2>
          <input
            className="field"
            value={props.myName}
            placeholder="名前（ルームで相手に見えます）"
            maxLength={20}
            onChange={(e) => props.onChangeName(e.target.value)}
          />
        </div>

        <div className="section-title">みんな ({props.members.length})</div>
        {props.members.length > SQUAD_LIMIT && (
          <div className="section-footer" style={{ marginTop: 0, marginBottom: 8 }}>
            一緒に回る人を {SQUAD_LIMIT} 人まで選ぶと、レリックの報酬にはその人たちの分だけ出ます。
          </div>
        )}
        {props.members.length === 0 ? (
          <Empty
            glyph={<PeopleIcon size={44} />}
            title="まだ誰もいません"
            description={
              props.roomCode
                ? 'ルームのコードを相手に伝えると、ここに並びます。'
                : 'ルームを作るか、相手のコードで参加すると、ここに並びます。'
            }
          />
        ) : (
          <div className="list">
            {props.members.map((member) => {
              const inSquad = props.squadIDs.includes(member.id)
              return (
                <Row key={member.id} onClick={() => props.onToggleSquad(member.id)}>
                  <span className="status" data-status={inSquad ? 2 : 0} aria-label={inSquad ? '分隊にいる' : '分隊にいない'}>
                    <StatusIcon status={inSquad ? 2 : 0} />
                  </span>
                  <span className="grow">
                    <span className="title">{member.name}</span>
                    <span className="sub">{member.states.size} パーツ記録済み</span>
                  </span>
                </Row>
              )
            })}
          </div>
        )}

        <div className="card">
          <h2>ルームで同期</h2>
          {!hasConfig ? (
            <FirebaseSetup onSaved={() => setHasConfig(true)} />
          ) : props.roomCode ? (
            <>
              <p className="note" style={{ marginTop: 0 }}>
                このコードを相手に伝えると、お互いの最新状況が自動で反映されます。
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0' }}>
                <code
                  style={{
                    fontSize: 26,
                    letterSpacing: 4,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}
                >
                  {props.roomCode}
                </code>
                <button type="button" style={{ color: 'var(--accent)' }} onClick={() => void copy(props.roomCode ?? '')}>
                  {copied ? 'コピーしました' : 'コピー'}
                </button>
              </div>
              <button type="button" style={{ color: 'var(--red)' }} onClick={props.onLeaveRoom}>
                ルームから抜ける
              </button>
            </>
          ) : (
            <>
              <p className="note" style={{ marginTop: 0 }}>
                相手のコードを入れるか、新しいルームを作ってコードを共有します。
              </p>
              <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
                <input
                  className="field"
                  value={codeInput}
                  placeholder="ABC123"
                  inputMode="text"
                  autoCapitalize="characters"
                  style={{ letterSpacing: 3, textTransform: 'uppercase' }}
                  onChange={(e) => setCodeInput(normalizeRoomCode(e.target.value))}
                />
                <button
                  type="button"
                  style={{
                    color: isValidRoomCode(codeInput) ? 'var(--accent)' : 'var(--tertiary)',
                    whiteSpace: 'nowrap',
                  }}
                  disabled={!isValidRoomCode(codeInput) || props.connecting}
                  onClick={() => props.onJoinRoom(codeInput)}
                >
                  参加
                </button>
              </div>
              <button
                type="button"
                style={{ color: 'var(--accent)' }}
                disabled={props.connecting}
                onClick={props.onCreateRoom}
              >
                新しいルームを作る
              </button>
            </>
          )}
          {props.connecting && <p className="note">接続しています…</p>}
          {props.roomError && <p className="error">{props.roomError}</p>}
        </div>
      </div>
    </>
  )
}

/** Firebase をまだ設定していないときに出す入力欄。 */
function FirebaseSetup({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (isConfiguredByEnv()) return null

  return (
    <>
      <p className="note" style={{ marginTop: 0 }}>
        ルーム同期には Firebase の設定が要ります。Firebase コンソールで作った Web アプリの
        設定（firebaseConfig）をそのまま貼り付けてください。
      </p>
      <textarea
        className="field"
        style={{ marginTop: 8 }}
        rows={4}
        value={text}
        placeholder={'{ apiKey: "…", authDomain: "…", projectId: "…", appId: "…" }'}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        style={{ color: 'var(--accent)', marginTop: 8 }}
        onClick={() => {
          const config = parseConfig(text)
          if (!config) {
            setError('apiKey / authDomain / projectId / appId が読み取れませんでした')
            return
          }
          saveFirebaseConfig(config)
          setError(null)
          onSaved()
        }}
      >
        保存
      </button>
      {error && <p className="error">{error}</p>}
    </>
  )
}
