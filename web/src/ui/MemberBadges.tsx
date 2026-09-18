import { statusOf } from '../state/collection'
import { NOT_OWNED } from '../data/types'
import { useApp } from './context'

/**
 * そのパーツを誰が持っているかを小さなバッジで並べる。
 * 一緒にレリックを開けるとき、誰の分がまだ足りないかを見るためのもの。
 */
export function MemberBadges({ partID }: { partID: string }) {
  const { catalog, members } = useApp()
  if (members.length === 0) return null
  const part = catalog.part(partID)
  if (!part) return null

  return (
    <div className="people">
      {members.map((member) => {
        const status = statusOf(member.states, part)
        return (
          <span
            key={member.id}
            className="person"
            data-has={status}
            title={`${member.name}: ${status === NOT_OWNED ? '未所持' : status === 1 ? '所持中' : '作成済み'}`}
          >
            {member.name.slice(0, 6)}
          </span>
        )
      })}
    </div>
  )
}
