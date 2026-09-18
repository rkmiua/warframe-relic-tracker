import { useMemo, useState } from 'react'
import { Empty, Meter, NavBar, Row, SearchField, Segmented, StatusButton, Vaulted } from './components'
import { GridIcon } from './icons'
import { MemberBadges } from './MemberBadges'
import { useApp } from './context'
import { collected, fractionOf, isComplete, progressOf, statusOf } from '../state/collection'
import { CRAFTED, NOT_OWNED, type PrimeSet } from '../data/types'

type SortOrder = 'name' | 'progress'

export function SetListScreen() {
  const { catalog, states, push } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [vaultedOnly, setVaultedOnly] = useState(false)
  const [sort, setSort] = useState<SortOrder>('name')

  const results = useMemo(() => {
    const matched = catalog.searchSets(query, category, vaultedOnly)
    if (sort === 'name') return matched
    return [...matched].sort((a, b) => {
      const pa = progressOf(a.partIDs, catalog, states)
      const pb = progressOf(b.partIDs, catalog, states)
      // 完成済みは末尾へ、あとは残りが少ない順
      if (isComplete(pa) !== isComplete(pb)) return isComplete(pa) ? 1 : -1
      const ra = pa.total - pa.crafted
      const rb = pb.total - pb.crafted
      if (ra !== rb) return ra - rb
      if (collected(pa) !== collected(pb)) return collected(pb) - collected(pa)
      return a.name.localeCompare(b.name)
    })
  }, [catalog, states, query, category, vaultedOnly, sort])

  return (
    <>
      <NavBar title="Prime" />
      <div className="content">
        <SearchField value={query} onChange={setQuery} placeholder="セット名・カテゴリ" />

        <Segmented
          label="並び替え"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: '名前順' },
            { value: 'progress', label: '完成が近い順' },
          ]}
        />

        <div className="chips">
          <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>
            すべて
          </button>
          {catalog.categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {c}
            </button>
          ))}
          <button type="button" aria-pressed={vaultedOnly} onClick={() => setVaultedOnly(!vaultedOnly)}>
            Vaulted
          </button>
        </div>

        {results.length === 0 ? (
          <Empty glyph={<GridIcon size={44} />} title="見つかりません" description="Prime の名前やカテゴリで探せます。" />
        ) : (
          <>
            <div className="section-title">{results.length} セット</div>
            <div className="list">
              {results.map((set) => (
                <SetRow key={set.id} set={set} onClick={() => push({ kind: 'set', id: set.id })} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export function SetRow({ set, onClick }: { set: PrimeSet; onClick: () => void }) {
  const { catalog, states } = useApp()
  const progress = progressOf(set.partIDs, catalog, states)
  const done = isComplete(progress)
  return (
    <Row
      onClick={onClick}
      chevron
      trailing={
        <span className="trail" style={done ? { color: 'var(--green)' } : undefined}>
          {progress.crafted}/{progress.total}
        </span>
      }
    >
      <span className="grow">
        <span className="title">
          {set.name}
          {done && <span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>完成</span>}
        </span>
        <span className="sub">
          {set.category}
          {set.vaulted && ' · Vaulted'}
        </span>
      </span>
    </Row>
  )
}

export function SetDetailScreen({ set, onBack }: { set: PrimeSet; onBack: () => void }) {
  const { catalog, states, setStatus, setMany, push } = useApp()
  const parts = catalog.partsOf(set)
  const progress = progressOf(set.partIDs, catalog, states)
  const done = isComplete(progress)

  return (
    <>
      <NavBar title={set.name} onBack={onBack} backLabel="Prime" trailing={set.vaulted ? <Vaulted /> : undefined} />
      <div className="content">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8 }}>
            <span>作成済み</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: done ? 'var(--green)' : undefined }}>
              {progress.crafted} / {progress.total}
            </span>
          </div>
          <Meter value={fractionOf(progress)} done={done} />
          <p className="note">
            {done
              ? 'コンプリート'
              : `所持中 ${progress.owned} · 未所持 ${progress.total - collected(progress)}`}
          </p>
        </div>

        <div className="section-title">パーツ</div>
        <div className="list">
          {parts.map((part) => (
            <Row key={part.id} onClick={() => push({ kind: 'part', id: part.id })} chevron>
              <span className="grow">
                <span className="title">
                  {part.shortName}
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

        <div className="list">
          <button type="button" className="action" onClick={() => setMany(set.partIDs, CRAFTED)}>
            すべて作成済みにする
          </button>
          <button type="button" className="action destructive" onClick={() => setMany(set.partIDs, NOT_OWNED)}>
            すべて未所持に戻す
          </button>
        </div>
      </div>
    </>
  )
}
