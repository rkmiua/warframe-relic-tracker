import { useMemo, useState } from 'react'
import {
  Empty,
  NavBar,
  RarityDot,
  Row,
  SearchField,
  StatusButton,
  TierGlyph,
  Vaulted,
  formatChance,
} from './components'
import { BoxIcon } from './icons'
import { MemberBadges } from './MemberBadges'
import { useApp } from './context'
import {
  anyoneNeedsCount,
  collected,
  progressOf,
  statusOf,
  everyoneNeedsCount,
} from '../state/collection'
import { BASE_REFINEMENT, TIERS, isTracked, type Relic, type RelicTier } from '../data/types'
import type { Catalog } from '../data/catalog'
import type { StatusMap } from '../state/seed'

/**
 * 足りないものを含むレリックに絞る。
 * 'mine' は自分だけを見るのでいつでも使えるが、残りは見比べる相手が要る。
 */
type NeedFilter = 'off' | 'mine' | 'untouched' | 'anyone'

const FILTER_LABEL: Record<Exclude<NeedFilter, 'off'>, string> = {
  mine: '未所持パーツあり',
  untouched: '全員未所持',
  anyone: '誰かが未所持',
}

const FILTER_HINT: Record<Exclude<NeedFilter, 'off'>, string> = {
  mine: '自分にまだ足りていない報酬が入っているレリック',
  untouched: '自分も分隊のみんなも、まだ揃えていない報酬が入っているレリック',
  anyone: '自分か分隊の誰か 1 人でも、まだ足りていない報酬が入っているレリック',
}

/** 絞り込みの種類ごとに「足りていない報酬」を数える。 */
function countFor(
  kind: Exclude<NeedFilter, 'off'>,
  relic: Relic,
  catalog: Catalog,
  mine: StatusMap,
  squad: { states: StatusMap }[],
): number {
  switch (kind) {
    case 'mine':
      // 見比べる相手を空にすれば、自分だけを見たことになる
      return anyoneNeedsCount(relic, catalog, mine, [])
    case 'anyone':
      return anyoneNeedsCount(relic, catalog, mine, squad)
    case 'untouched':
      return everyoneNeedsCount(relic, catalog, mine, squad)
  }
}

export function RelicListScreen() {
  const { catalog, states, squad, inRoom, push } = useApp()
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<RelicTier | null>(null)
  const [vaultedOnly, setVaultedOnly] = useState(false)
  const [need, setNeed] = useState<NeedFilter>('off')

  // ルームから出たら、人と見比べる絞り込みは意味がないので自分だけの見方に戻す
  const activeNeed: NeedFilter = inRoom || need === 'mine' ? need : 'off'

  const results = useMemo(() => {
    const matched = catalog.searchRelics(query, tier, vaultedOnly)
    if (activeNeed === 'off') return matched
    return matched.filter((relic) => countFor(activeNeed, relic, catalog, states, squad) > 0)
  }, [catalog, query, tier, vaultedOnly, activeNeed, states, squad])

  return (
    <>
      <NavBar title="レリック" />
      <div className="content">
        <SearchField value={query} onChange={setQuery} placeholder="レリック名・報酬パーツ名" />

        <div className="chips">
          <button type="button" aria-pressed={tier === null} onClick={() => setTier(null)}>
            すべて
          </button>
          {TIERS.map((t) => (
            <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(tier === t ? null : t)}>
              {t}
            </button>
          ))}
          <button type="button" aria-pressed={vaultedOnly} onClick={() => setVaultedOnly(!vaultedOnly)}>
            Vaulted
          </button>
        </div>

        <div className="chips">
          {(inRoom ? (['mine', 'untouched', 'anyone'] as const) : (['mine'] as const)).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={need === kind}
              onClick={() => setNeed(need === kind ? 'off' : kind)}
              title={FILTER_HINT[kind]}
            >
              {FILTER_LABEL[kind]}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <Empty
            glyph={<BoxIcon size={44} />}
            title={activeNeed === 'off' ? '見つかりません' : '当てはまるレリックがありません'}
            description={
              activeNeed === 'mine'
                ? 'この条件だと、自分にまだ足りていない報酬を含むレリックはありません。'
                : activeNeed === 'untouched'
                  ? 'この条件だと、みんなが揃えていない報酬を含むレリックはありません。'
                  : activeNeed === 'anyone'
                    ? 'この条件だと、誰かが必要としている報酬を含むレリックはありません。'
                    : 'レリック名（Lith A1）か、報酬のパーツ名で探せます。'
            }
          />
        ) : (
          <>
            <div className="section-title">{results.length} 件</div>
            <div className="list">
              {results.map((relic) => (
                <RelicRow
                  key={relic.id}
                  relic={relic}
                  need={activeNeed}
                  onClick={() => push({ kind: 'relic', id: relic.id })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function RelicRow({ relic, need, onClick }: { relic: Relic; need: NeedFilter; onClick: () => void }) {
  const { catalog, states, squad } = useApp()

  // 絞り込んでいるときは、その基準の数を出したほうが分かりやすい
  const trailing = (() => {
    if (need === 'untouched' || need === 'anyone') {
      const count = countFor(need, relic, catalog, states, squad)
      return { text: `${need === 'untouched' ? '全員' : '誰か'} ${count}`, done: count === 0 }
    }
    const tracked = relic.rewards
      .map((r) => catalog.part(r.partID))
      .filter((p) => p && isTracked(p))
      .map((p) => p!.id)
    const progress = progressOf(tracked, catalog, states)
    const missing = progress.total - collected(progress)
    return { text: missing === 0 ? 'すべて所持' : `未所持 ${missing}`, done: missing === 0 }
  })()

  return (
    <Row
      onClick={onClick}
      chevron
      trailing={
        <span className="trail" style={trailing.done ? { color: 'var(--green)' } : undefined}>
          {trailing.text}
        </span>
      }
    >
      <TierGlyph tier={relic.tier} />
      <span className="grow">
        <span className="title">
          {relic.id}
          {relic.vaulted && <Vaulted />}
        </span>
      </span>
    </Row>
  )
}

export function RelicDetailScreen({ relic, onBack }: { relic: Relic; onBack: () => void }) {
  const { catalog, states, setStatus, push } = useApp()

  return (
    <>
      <NavBar
        title={relic.id}
        onBack={onBack}
        backLabel="レリック"
        trailing={relic.vaulted ? <Vaulted /> : undefined}
      />
      <div className="content">
        <div className="section-title">報酬</div>
        <div className="list">
          {relic.rewards.map((reward) => {
            const part = catalog.part(reward.partID)
            if (!part) return null
            const tracked = isTracked(part)
            return (
              <Row
                key={reward.partID}
                onClick={tracked ? () => push({ kind: 'part', id: part.id }) : undefined}
                chevron={tracked}
              >
                <RarityDot rarity={reward.rarity} />
                <span className="grow">
                  <span className="title">
                    {part.id}
                    {part.required > 1 && <span className="badge">×{part.required}</span>}
                  </span>
                  <span className="sub">
                    {reward.rarity} · {formatChance(reward.chance[BASE_REFINEMENT] ?? 0)}
                  </span>
                  {tracked && <MemberBadges partID={part.id} />}
                </span>
                {tracked && (
                  <StatusButton
                    status={statusOf(states, part)}
                    required={part.required}
                    name={part.id}
                    onChange={(next) => setStatus(part, next)}
                  />
                )}
              </Row>
            )
          })}
        </div>
        <div className="section-footer">丸をタップすると持ち具合が一段ずつ進みます。</div>
      </div>
    </>
  )
}
