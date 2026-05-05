import { useState } from 'react'
import Icon from './ui/Icon'
import Avatar from './ui/Avatar'
import MarkerPin from './ui/MarkerPin'
import { heatColor } from './ui/MarkerPin'

interface MarkerAuthor {
  name: string
  hue?: number
  avatarUrl?: string
}

interface MarkerDetail {
  id: string
  title: string
  description?: string
  lat: number
  lon: number
  like_weight: number
  comment_count: number
  view_count?: number
  tags?: string[]
  photos?: string[]
  author: MarkerAuthor
  ttl_label?: string
}

interface CommentItem {
  id: string
  author: MarkerAuthor
  text: string
  time: string
}

interface RightDrawerProps {
  marker: MarkerDetail | null
  onClose: () => void
  onShare?: () => void
  onDelete?: () => void
}

const MOCK_COMMENTS: CommentItem[] = [
  { id: '1', author: { name: 'Михайло', hue: 1 }, text: 'Чудове місце!', time: '2 г' },
  { id: '2', author: { name: 'Олена', hue: 3 }, text: 'Була в неділю — рекомендую раніше за 10:00.', time: '5 г' },
  { id: '3', author: { name: 'Костя', hue: 2 }, text: 'А скільки коштує вхід?', time: '1 д' },
]

export default function RightDrawer({ marker, onClose, onShare, onDelete }: RightDrawerProps) {
  const [liked, setLiked] = useState(false)
  const [commentText, setCommentText] = useState('')

  if (!marker) return null

  const photos = marker.photos ?? []
  const tags = marker.tags ?? []
  const weight = marker.like_weight + (liked ? 1 : 0)

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[420px] z-[125] bg-white overflow-y-auto shadow-[-4px_0_16px_rgba(15,23,42,0.10)] animate-[slideRight_280ms_cubic-bezier(0.2,0,0,1)]">
      {/* Photo / header */}
      <div
        className="relative h-[240px] flex-shrink-0"
        style={{
          background:
            photos.length > 0
              ? `url(${photos[0]}) center/cover`
              : 'linear-gradient(135deg, #475569, #0F172A)',
        }}
      >
        {photos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <Icon name="image" size={48} strokeWidth={1.5} />
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-slate-900 hover:bg-white transition-colors"
        >
          <Icon name="x" size={18} />
        </button>
        {onShare && (
          <button
            onClick={onShare}
            className="absolute top-3.5 right-[60px] w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-slate-900 hover:bg-white transition-colors"
          >
            <Icon name="share" size={16} />
          </button>
        )}
      </div>

      <div className="px-5 py-[18px] pb-8">
        {/* Title row */}
        <div className="flex gap-3 items-start mb-3">
          <MarkerPin weight={marker.like_weight} size={28} />
          <div className="flex-1">
            <h2 className="text-[20px] font-bold text-slate-900 leading-tight tracking-tight">{marker.title}</h2>
            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
              {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
            </div>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>

        {/* Author row */}
        <div className="flex items-center gap-2.5 py-2.5 border-y border-slate-100 mb-3.5">
          <Avatar name={marker.author.name} size={28} hue={marker.author.hue} avatarUrl={marker.author.avatarUrl} />
          <div className="flex-1">
            <div className="text-xs font-semibold text-slate-900">{marker.author.name}</div>
            <div className="text-[11px] text-slate-500">3 дні тому</div>
          </div>
          {marker.ttl_label && (
            <div className="inline-flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-amber-800">
              <Icon name="clock" size={12} stroke="#92400E" />
              {marker.ttl_label}
            </div>
          )}
        </div>

        {/* Description */}
        {marker.description && (
          <p className="text-[14px] text-slate-900 leading-relaxed mb-3.5">{marker.description}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 py-3 border-y border-slate-100 mb-3.5">
          <div>
            <div className="font-mono text-base font-bold" style={{ color: heatColor(marker.like_weight) }}>
              {weight >= 0 ? '+' : ''}{weight}
            </div>
            <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">like_weight</div>
          </div>
          <div>
            <div className="font-mono text-base font-bold text-slate-900">{marker.comment_count}</div>
            <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">коментарів</div>
          </div>
          {marker.view_count != null && (
            <div>
              <div className="font-mono text-base font-bold text-slate-900">{marker.view_count}</div>
              <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">переглядів</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setLiked((v) => !v)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold border transition-all ${
              liked
                ? 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon name="heart" size={14} fill={liked ? 'white' : 'none'} stroke={liked ? 'white' : 'currentColor'} />
            Подобається
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
            <Icon name="navigation" size={14} />
            Маршрут
          </button>
        </div>

        {/* Comments */}
        <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2.5">
          Коментарі · {MOCK_COMMENTS.length}
        </div>
        <div className="space-y-2.5 mb-4">
          {MOCK_COMMENTS.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.author.name} size={28} hue={c.author.hue} />
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{c.author.name}</span>
                  <span className="text-[11px] text-slate-400">{c.time}</span>
                </div>
                <p className="text-[13px] text-slate-900 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comment input */}
        <div className="flex gap-2 items-center bg-slate-100 rounded-full py-1 pl-3.5 pr-1">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Написати коментар…"
            className="flex-1 bg-transparent border-0 text-[13px] outline-none"
          />
          <button
            disabled={!commentText.trim()}
            className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-slate-300 text-white flex items-center justify-center transition-colors"
          >
            <Icon name="send" size={14} stroke="white" />
          </button>
        </div>
      </div>
    </div>
  )
}
