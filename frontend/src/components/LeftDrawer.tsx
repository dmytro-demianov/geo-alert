import { useState } from 'react'
import Icon from './ui/Icon'
import MarkerPin from './ui/MarkerPin'
import PrivacyBadge from './ui/PrivacyBadge'
import { heatColor } from './ui/MarkerPin'

interface MarkerItem {
  id: string
  title: string
  description?: string
  like_weight: number
  comment_count: number
  dist?: number
  created_at?: string
}

interface CardItem {
  id: string
  title: string
  marker_count: number
  subscriber_count: number
  privacy: string
}

interface LeftDrawerProps {
  open: boolean
  onClose: () => void
  markers?: MarkerItem[]
  cards?: CardItem[]
  onOpenMarker?: (marker: MarkerItem) => void
  onOpenCard?: (card: CardItem) => void
  onCreateCard?: () => void
}

type Tab = 'markers' | 'cards' | 'mine'
type Filter = 'all' | 'hot' | 'near' | 'recent'

export default function LeftDrawer({
  open,
  onClose,
  markers = [],
  cards = [],
  onOpenMarker,
  onOpenCard,
  onCreateCard,
}: LeftDrawerProps) {
  const [tab, setTab] = useState<Tab>('markers')
  const [filter, setFilter] = useState<Filter>('all')

  const filteredMarkers = markers.filter((m) => {
    if (filter === 'hot') return m.like_weight >= 6
    if (filter === 'near') return (m.dist ?? Infinity) <= 500
    if (filter === 'recent') {
      if (!m.created_at) return true
      return Date.now() - new Date(m.created_at).getTime() < 24 * 60 * 60 * 1000
    }
    return true
  })

  return (
    <div
      className="absolute top-0 left-0 bottom-0 z-[120] overflow-hidden flex flex-col bg-white transition-[width] duration-[280ms] ease-[cubic-bezier(0.2,0,0,1)]"
      style={{
        width: open ? 360 : 0,
        boxShadow: open ? '4px 0 16px rgba(15,23,42,0.10)' : 'none',
      }}
    >
      <div className="w-[360px] h-full flex flex-col">
        {/* Header */}
        <div className="px-[18px] pt-4 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px] font-bold text-slate-900 flex-1">Позначки</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {([['markers', 'Позначки'], ['cards', 'Картки'], ['mine', 'Мої']] as [Tab, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3.5 py-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                  tab === k
                    ? 'text-brand-600 border-brand-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        {tab === 'markers' && (
          <div className="px-[18px] py-2.5 border-b border-slate-100 flex gap-1.5 overflow-x-auto flex-shrink-0">
            {([['all', 'Усі'], ['hot', '🔥 Гарячі'], ['near', 'Поруч'], ['recent', 'Нові']] as [Filter, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  filter === k
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'markers' && (
            <>
              {filteredMarkers.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">Позначок не знайдено</div>
              )}
              {filteredMarkers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onOpenMarker?.(m)}
                  className="px-[18px] py-3 flex gap-3 cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <MarkerPin weight={m.like_weight} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 items-baseline">
                      <span className="text-[14px] font-semibold text-slate-900 truncate">{m.title}</span>
                      <span
                        className="text-[10px] font-bold font-mono rounded-full px-1.5 py-0.5 text-white flex-shrink-0"
                        style={{ background: heatColor(m.like_weight) }}
                      >
                        {m.like_weight >= 0 ? '+' : ''}{m.like_weight}
                      </span>
                    </div>
                    {m.description && (
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{m.description}</div>
                    )}
                    <div className="flex gap-3 mt-1.5 text-slate-400 text-[11px]">
                      <span>♥ {m.like_weight}</span>
                      <span>💬 {m.comment_count}</span>
                      {m.dist != null && <span className="font-mono">{m.dist} м</span>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'cards' && (
            <div className="p-3.5">
              {cards.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-sm">Немає доступних карт</div>
              )}
              {cards.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpenCard?.(c)}
                  className="p-3 border border-slate-100 rounded-lg mb-2 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-slate-900 flex-1">{c.title}</span>
                    <PrivacyBadge value={c.privacy} />
                  </div>
                  <div className="text-[11px] text-slate-500">{c.marker_count} позначок · {c.subscriber_count} підписників</div>
                </div>
              ))}
              <button
                onClick={onCreateCard}
                className="w-full mt-1 py-2 flex items-center justify-center gap-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Icon name="plus" size={15} />
                Створити картку
              </button>
            </div>
          )}

          {tab === 'mine' && (
            <div className="p-8 text-center text-slate-400 text-sm">
              У вас поки немає власних позначок.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
