import { useMemo, useState } from 'react'
import { Empty, NavBar, Row, SearchField, Segmented, StatusButton, TierGlyph, Vaulted, formatChance } from './components'
import { SearchIcon } from './icons'
import { MemberBadges } from './MemberBadges'
import { SetRow } from './SetScreens'
import { useApp } from './context'
import { needsMore, statusOf } from '../state/collection'
import {
  BASE_REFINEMENT,
  isTracked,
  selectableStatuses,
  statusLabel,
  type Part,
  type Status,
} from '../data/types'

export function PartSearchScreen() {
  const { catalog, states, setStatus, push } = useApp()
  const [query, setQuery] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)

  const results = useMemo(() => {
    // Forma のような消耗品は記録しないので、検索にも出さない
    const matched = catalog.searchParts(query).filter(isTracked)
    return missingOnly ? matched.filter((part) => needsMore(states, part)) : matched
  }, [catalog, states, query, missingOnly])

  return (
    <>
      <NavBar title="パーツ検索" />
      <div className="content">
        <SearchField value={query} onChange={setQuery} placeholder="パーツ名（例: Saryn, Barrel）" />
        <div className="chips">
          <button type="button" aria-pressed={missingOnly} onClick={() => setMissingOnly(!missingOnly)}>
            足りないものだけ
          </button>
        </div>

        {!query ? (
          <Empty
            glyph={<SearchIcon size={44} />}
            title="パーツを検索"
            description={`Prime の名前やパーツ名で、全 ${catalog.trackedPartCount} 種類から探せます。`}
          />
        ) : results.length === 0 ? (
          <Empty glyph={<SearchIcon size={44} />} title="見つかりません" description="別の言葉で試してみてください。" />
        ) : (
          <>
            <div className="section-title">{results.length} 件</div>
            <div className="list">
              {results.map((part) => (
                <Row key={part.id} onClick={() => push({ kind: 'part', id: part.id })} chevron>
                  <span className="grow">
                    <span className="title">
                      {part.id}
                      {part.required > 1 && <span className="badge">×{part.required}</span>}
                    </span>
                    <MemberBadges partID={part.id} />
                  </span>
                  <StatusButton
                    status={statusOf(states, part)}
                    required={part.required}
                    name={part.id}
                    onChange={(next) => setStatus(part, next)}
                  />
                </Row>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export function PartDetailScreen({ part, onBack }: { part: Part; onBack: () => void }) {
  const { catalog, states, setStatus, members, push } = useApp()
  const sources = useMemo(() => catalog.sources(part.id, BASE_REFINEMENT), [catalog, part.id])
  const set = part.setID ? catalog.set(part.setID) : undefined
  const status = statusOf(states, part)

  return (
    <>
      <NavBar title={part.id} onBack={onBack} />
      <div className="content">
        <div className="section-title">状態</div>
        <Segmented
          label="状態"
          value={String(status)}
          onChange={(value) => setStatus(part, Number(value) as Status)}
          options={selectableStatuses(part.required).map((value) => ({
            value: String(value),
            label: statusLabel(value, part.required),
          }))}
        />
        {part.required > 1 && (
          <div className="section-footer" style={{ marginTop: -6 }}>
            このパーツは 1 セットに {part.required} 個必要です。
          </div>
        )}

        {members.length > 0 && (
          <>
            <div className="section-title">みんなの状況</div>
            <div className="list">
              {members.map((member) => {
                const memberStatus = statusOf(member.states, part)
                return (
                  <Row
                    key={member.id}
                    trailing={
                      <span
                        className="trail"
                        style={{
                          color:
                            memberStatus === 3
                              ? 'var(--green)'
                              : memberStatus > 0
                                ? 'var(--orange)'
                                : undefined,
                        }}
                      >
                        {statusLabel(memberStatus, part.required)}
                      </span>
                    }
                  >
                    <span className="grow">{member.name}</span>
                  </Row>
                )
              })}
            </div>
          </>
        )}

        {set && (
          <>
            <div className="section-title">セット</div>
            <div className="list">
              <SetRow set={set} onClick={() => push({ kind: 'set', id: set.id })} />
            </div>
          </>
        )}

        <div className="section-title">入手できるレリック ({sources.length})</div>
        <div className="list">
          {sources.map(({ relic, chance }) => (
            <Row
              key={relic.id}
              onClick={() => push({ kind: 'relic', id: relic.id })}
              chevron
              trailing={<span className="trail">{formatChance(chance)}</span>}
            >
              <TierGlyph tier={relic.tier} />
              <span className="grow">
                <span className="title">
                  {relic.id}
                  {relic.vaulted && <Vaulted />}
                </span>
              </span>
            </Row>
          ))}
        </div>
        <div className="section-footer">確率の高い順に並んでいます。</div>
      </div>
    </>
  )
}
