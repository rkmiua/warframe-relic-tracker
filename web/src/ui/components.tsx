import type { ReactNode } from 'react'
import { BackIcon, ChevronIcon, LockIcon, SearchIcon, StatusIcon } from './icons'
import type { Rarity, RelicTier, Status } from '../data/types'
import { CRAFTED, nextStatus, ownedCount, statusLabel } from '../data/types'

export function NavBar({
  title,
  onBack,
  backLabel,
  trailing,
}: {
  title: string
  onBack?: () => void
  backLabel?: string
  trailing?: ReactNode
}) {
  return (
    <div className="navbar">
      <div className="lead">
        {onBack && (
          <button type="button" onClick={onBack}>
            <BackIcon />
            {backLabel ?? '戻る'}
          </button>
        )}
      </div>
      <h1>{title}</h1>
      <div className="trail">{trailing}</div>
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="search">
      <span className="glass">
        <SearchIcon size={15} />
      </span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="clear" aria-label="検索を消す" onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * タップするたびに一段ずつ進むボタン。
 * 2 個要るパーツでは、いくつ持っているかを数字で添える。
 */
export function StatusButton({
  status,
  onChange,
  name,
  required = 1,
}: {
  status: Status
  onChange: (status: Status) => void
  name: string
  required?: number
}) {
  const label = statusLabel(status, required)
  const showCount = required > 1 && status !== CRAFTED
  return (
    <button
      type="button"
      className="status-button"
      aria-label={`${name} の状態: ${label}`}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(nextStatus(status, required))
      }}
    >
      <span className="status" data-status={status}>
        <StatusIcon status={status} />
      </span>
      {showCount && (
        <span className="status-count">
          {ownedCount(status, required)}/{required}
        </span>
      )}
    </button>
  )
}

export function Row({
  onClick,
  children,
  trailing,
  chevron,
}: {
  onClick?: () => void
  children: ReactNode
  trailing?: ReactNode
  chevron?: boolean
}) {
  const content = (
    <>
      {children}
      {trailing}
      {chevron && (
        <span className="chevron">
          <ChevronIcon />
        </span>
      )}
    </>
  )
  if (onClick) {
    return (
      <button type="button" className="row" onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className="row">{content}</div>
}

export function Empty({ title, description, glyph }: { title: string; description: string; glyph?: ReactNode }) {
  return (
    <div className="empty">
      {glyph && <span className="glyph">{glyph}</span>}
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export function Meter({ value, done }: { value: number; done?: boolean }) {
  return (
    <div className={done ? 'meter done' : 'meter'}>
      <div style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

const TIER_COLOR: Record<RelicTier, string> = {
  Lith: 'var(--brown)',
  Meso: 'var(--gray)',
  Neo: 'var(--yellow)',
  Axi: 'var(--accent)',
  Vanguard: 'var(--teal)',
}

export function TierGlyph({ tier }: { tier: RelicTier }) {
  return (
    <span className="tier" style={{ color: TIER_COLOR[tier] }} aria-label={tier}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.6 3.2 7v10L12 21.4 20.8 17V7z" opacity="0.9" />
      </svg>
    </span>
  )
}

const RARITY_COLOR: Record<Rarity, string> = {
  Common: 'var(--brown)',
  Uncommon: 'var(--gray)',
  Rare: 'var(--yellow)',
}

export function RarityDot({ rarity }: { rarity: Rarity }) {
  return <span className="dot" style={{ background: RARITY_COLOR[rarity] }} title={rarity} />
}

export function Vaulted() {
  return (
    <span className="lock" title="Vaulted（禁庫入り）">
      <LockIcon />
    </span>
  )
}

export function formatChance(chance: number): string {
  return `${Number(chance.toFixed(2))}%`
}
