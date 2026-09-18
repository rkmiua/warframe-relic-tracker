import { useMemo, useState } from 'react'
import { Empty, NavBar, RarityDot, Row, SearchField, Segmented, StatusButton, TierGlyph, Vaulted, formatChance } from './components'
import { BoxIcon } from './icons'
import { MemberBadges } from './MemberBadges'
import { useApp } from './context'
import { collected, progressOf, statusOf } from '../state/collection'
import { REFINEMENTS, REFINEMENT_LABELS, TIERS, type Refinement, type Relic, type RelicTier } from '../data/types'

export function RelicListScreen() {
  const { catalog, states, push } = useApp()
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<RelicTier | null>(null)
  const [vaultedOnly, setVaultedOnly] = useState(false)

  const results = useMemo(
    () => catalog.searchRelics(query, tier, vaultedOnly),
    [catalog, query, tier, vaultedOnly],
  )

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

        {results.length === 0 ? (
          <Empty
            glyph={<BoxIcon size={44} />}
            title="見つかりません"
            description="レリック名（Lith A1）か、報酬のパーツ名で探せます。"
          />
        ) : (
          <>
            <div className="section-title">{results.length} 件</div>
            <div className="list">
              {results.map((relic) => {
                const progress = progressOf(relic.rewards.map((r) => r.partID), catalog, states)
                const missing = progress.total - collected(progress)
                return (
                  <Row
                    key={relic.id}
                    onClick={() => push({ kind: 'relic', id: relic.id })}
                    chevron
                    trailing={
                      <span className="trail" style={missing === 0 ? { color: 'var(--green)' } : undefined}>
                        {missing === 0 ? 'すべて所持' : `未所持 ${missing}`}
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
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export function RelicDetailScreen({ relic, onBack }: { relic: Relic; onBack: () => void }) {
  const { catalog, states, setStatus, push } = useApp()
  const [refinement, setRefinement] = useState<Refinement>('intact')

  return (
    <>
      <NavBar
        title={relic.id}
        onBack={onBack}
        backLabel="レリック"
        trailing={relic.vaulted ? <Vaulted /> : undefined}
      />
      <div className="content">
        <Segmented
          label="精錬"
          value={refinement}
          onChange={setRefinement}
          options={REFINEMENTS.map((r) => ({ value: r, label: REFINEMENT_LABELS[r] }))}
        />

        <div className="section-title">報酬</div>
        <div className="list">
          {relic.rewards.map((reward) => {
            const part = catalog.part(reward.partID)
            if (!part) return null
            const status = statusOf(states, part)
            return (
              <Row key={reward.partID} onClick={() => push({ kind: 'part', id: part.id })} chevron>
                <RarityDot rarity={reward.rarity} />
                <span className="grow">
                  <span className="title">
                    {part.id}
                    {part.required > 1 && <span className="badge">×{part.required}</span>}
                  </span>
                  <span className="sub">
                    {reward.rarity} · {formatChance(reward.chance[refinement] ?? 0)}
                  </span>
                  <MemberBadges partID={part.id} />
                </span>
                <StatusButton status={status} name={part.id} onChange={(next) => setStatus(part, next)} />
              </Row>
            )
          })}
        </div>
        <div className="section-footer">
          丸をタップすると 未所持 → 所持中 → 作成済み と切り替わります。
        </div>
      </div>
    </>
  )
}
