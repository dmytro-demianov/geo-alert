import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { feedApi, FeedItem } from '@/api/feed'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import { heatColor } from '@/components/ui/MarkerPin'

// --- helpers ---

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'щойно'
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн тому`
  return `${Math.floor(diff / 2592000)} міс тому`
}

// --- FeedCard component ---

interface FeedCardProps {
  item: FeedItem
  onClick: () => void
}

function FeedCard({ item, onClick }: FeedCardProps) {
  const { marker, card, actor } = item
  const photoUrl = marker.photo_urls?.[0] ?? null

  return (
    <article
      onClick={onClick}
      className="card bg-white cursor-pointer hover:shadow-md transition-shadow duration-200 overflow-hidden rounded-lg"
    >
      {/* Photo / placeholder */}
      <div className="relative h-40 bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={marker.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <Icon name="image" size={32} stroke="#CBD5E1" />
            <span className="text-xs text-slate-400">Немає фото</span>
          </div>
        )}
        {/* Heat badge */}
        <div
          className="absolute top-2.5 right-2.5 font-mono text-[11px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
          style={{ background: heatColor(marker.like_weight) }}
        >
          {marker.like_weight >= 0 ? '+' : ''}{marker.like_weight}
        </div>
      </div>

      <div className="p-3.5">
        {/* Title + description */}
        <h3 className="text-[15px] font-semibold text-slate-900 truncate leading-tight mb-0.5">
          {marker.title}
        </h3>
        {marker.description && (
          <p className="text-[13px] text-slate-500 line-clamp-2 leading-snug mb-2">
            {marker.description}
          </p>
        )}

        {/* Tags */}
        {marker.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {marker.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
              >
                #{tag}
              </span>
            ))}
            {marker.tags.length > 4 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                +{marker.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Card source */}
        <div className="flex items-center gap-1.5 mb-3 text-[12px] text-slate-500">
          <Icon name="layers" size={13} stroke="#94A3B8" />
          <span className="truncate">{card.title}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
          {/* Actor + time */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              name={actor.display_name || 'Користувач'}
              size={24}
              avatarUrl={actor.avatar_url || null}
            />
            <span className="text-[12px] font-medium text-slate-700 truncate">
              {actor.display_name}
            </span>
            <span className="text-[11px] text-slate-400 flex-shrink-0">
              · {timeAgo(item.created_at)}
            </span>
          </div>

          {/* Counters */}
          <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-shrink-0">
            <span className="flex items-center gap-1">
              <Icon name="heart" size={13} stroke="#EF4444" />
              <span>{marker.like_weight}</span>
            </span>
            <span className="flex items-center gap-1">
              <Icon name="message" size={13} stroke="#94A3B8" />
              <span>{marker.comment_count}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

// --- FeedPage ---

export default function FeedPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const nextCursorRef = useRef<string | null>(null)
  const nextBeforeIdRef = useRef<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    setError(null)
    try {
      const res = await feedApi.getFeed({
        limit: 20,
        before: nextCursorRef.current ?? undefined,
        before_id: nextBeforeIdRef.current ?? undefined,
      })
      const data = res.data
      setItems((prev) => [...prev, ...(data.items ?? [])])
      nextCursorRef.current = data.next_cursor
      nextBeforeIdRef.current = data.next_before_id
      if (!data.next_cursor || (data.items ?? []).length === 0) {
        setHasMore(false)
      }
    } catch {
      setError('Не вдалося завантажити стрічку. Спробуйте ще раз.')
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [loading, hasMore])

  // Initial load
  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loadMore])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-900/[0.06] shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon name="chevron-right" size={18} stroke="#64748B" className="rotate-180" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Icon name="list" size={18} stroke="#EF4444" />
            <span className="text-[17px] font-bold text-slate-900">Стрічка активності</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Initial skeleton / error */}
        {initialLoad && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card bg-white rounded-lg overflow-hidden animate-pulse">
                <div className="h-40 bg-slate-200" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!initialLoad && error && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-3">
              <Icon name="alert-circle" size={36} stroke="#CBD5E1" className="mx-auto" />
            </div>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={() => { setHasMore(true); loadMore() }}
              className="btn-primary px-5 py-2 text-sm"
            >
              Спробувати ще
            </button>
          </div>
        )}

        {!initialLoad && items.length === 0 && !loading && !error && (
          <div className="text-center py-20">
            <div className="mb-4 text-slate-300">
              <Icon name="list" size={48} stroke="#CBD5E1" className="mx-auto" />
            </div>
            <p className="text-slate-500 font-medium">Стрічка поки порожня</p>
            <p className="text-slate-400 text-sm mt-1">Нові позначки будуть з'являтися тут</p>
          </div>
        )}

        {/* Feed items */}
        {!initialLoad && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/cards/${item.card.id}`)}
              />
            ))}
          </div>
        )}

        {/* Sentinel + loading spinner */}
        <div ref={sentinelRef} className="mt-6 flex justify-center">
          {loading && !initialLoad && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <svg className="animate-spin h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Завантаження…
            </div>
          )}
          {!hasMore && !loading && items.length > 0 && (
            <p className="text-slate-400 text-sm py-4">Нових записів немає</p>
          )}
        </div>
      </div>
    </div>
  )
}
