import { statusOf } from '../state/collection'
import { NOT_OWNED } from '../data/types'
import { useApp } from './context'

/** 名前を並べるのは、このくらいの人数まで。それを超えたら数にまとめる。 */
const MAX_NAMES = 4

/**
 * そのパーツを「まだ持っていない人」だけを並べる。
 *
 * 一緒にレリックを開けるときに知りたいのは誰の分が足りないかなので、
 * すでに持っている人は出さない（全員分を見たいときはパーツ詳細の「みんなの状況」へ）。
 */
export function MemberBadges({ partID }: { partID: string }) {
  const { catalog, squad } = useApp()
  if (squad.length === 0) return null
  const part = catalog.part(partID)
  if (!part) return null

  const missing = squad.filter((member) => statusOf(member.states, part) === NOT_OWNED)

  if (missing.length === 0) {
    return (
      <div className="people">
        <span className="person" data-has="all">
          全員所持
        </span>
      </div>
    )
  }

  if (missing.length > MAX_NAMES) {
    return (
      <div className="people">
        <span className="person" data-has="0" title={missing.map((m) => m.name).join('、')}>
          {missing.length}/{squad.length} 人が未所持
        </span>
      </div>
    )
  }

  return (
    <div className="people">
      {missing.map((member) => (
        <span key={member.id} className="person" data-has="0" title={`${member.name}: 未所持`}>
          {member.name}
        </span>
      ))}
    </div>
  )
}
