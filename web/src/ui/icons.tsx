/** SF Symbols に対応する形を最小限の SVG で描く。絵文字は環境で見た目が変わるので使わない。 */

interface IconProps {
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const BoxIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M12 3 4 7v10l8 4 8-4V7z" />
    <path d="M4 7l8 4 8-4M12 11v10" />
  </svg>
)

export const GridIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </svg>
)

export const SearchIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

export const PeopleIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6" />
    <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 14.8c2.1.7 3.5 2.6 3.5 5.2" />
  </svg>
)

export const ChevronIcon = ({ size = 14 }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.4} aria-hidden="true">
    <path d="M9 4l8 8-8 8" />
  </svg>
)

export const BackIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.4} aria-hidden="true">
    <path d="M15 4l-8 8 8 8" />
  </svg>
)

export const LockIcon = ({ size = 11 }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
)

export const EllipsisIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="8" cy="12" r="0.9" fill="currentColor" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    <circle cx="16" cy="12" r="0.9" fill="currentColor" />
  </svg>
)

/** 未所持・1 個・2 個・作成済みを表す 4 つの形。 */
export const StatusIcon = ({ status, size = 22 }: { status: 0 | 1 | 2 | 3; size?: number }) => {
  if (status === 3) {
    return (
      <svg {...base(size)} aria-hidden="true">
        <circle cx="12" cy="12" r="9.2" fill="currentColor" stroke="none" />
        <path d="M7.8 12.3l2.9 2.9 5.5-5.9" stroke="var(--card)" strokeWidth={2.2} />
      </svg>
    )
  }
  if (status === 2) {
    // 2 個持ち: ほとんど埋まっている
    return (
      <svg {...base(size)} aria-hidden="true">
        <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="9.2" />
      </svg>
    )
  }
  if (status === 1) {
    // 1 個持ち: 半分
    return (
      <svg {...base(size)} aria-hidden="true">
        <path d="M12 2.8a9.2 9.2 0 0 0 0 18.4z" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="9.2" />
      </svg>
    )
  }
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
    </svg>
  )
}
