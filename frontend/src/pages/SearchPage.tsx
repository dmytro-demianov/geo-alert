import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchApi, SearchMarker, SearchCard, SearchUser, SearchType } from '@/api/search'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { heatColor } from '@/components/ui/MarkerPin'

// --- Skeleton ---

function SkeletonCard() {
  return (
    <div className="card p-3.5 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-full mb-1" />
      <div className="h-3 bg-slate-100 rounded w-2/3" />
    </div>
  )
}

// --- Marker Card ---

function MarkerResultCard({ item }: { item: SearchMarker }) {
  const navigate = useNavigate()
  return (
    <div
      className="card p-3.5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/cards/${item.card_id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-[14px] font-semibold text-slate-900 truncate">{item.title}</h3>
        <span
          className="font-mono text-xs font-bold flex-shrink-0"
          style={{ color: heatColor(item.like_weight) }}
        >
          {item.like_weight >= 0 ? '+' : ''}{item.like_weight}
        </span>
      </div>
      {item.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Icon name="heart" size={10} />{item.like_weight}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="message" size={10} />{item.comment_count}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="map-pin" size={10} />
          {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
        </span>
      </div>
    </div>
  )
}

// --- Card Result Card ---

function CardResultCard({ item }: { item: SearchCard }) {
  const navigate = useNavigate()
  return (
    <div
      className="card p-3.5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/cards/${item.id}`)}
    >
      <h3 className="text-[14px] font-semibold text-slate-900 truncate mb-1">{item.title}</h3>
      {item.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
      )}
      <div className="flex gap-3 text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Icon name="map-pin" size={10} />{item.marker_count} меток
        </span>
        <span className="flex items-center gap-1">
          <Icon name="user" size={10} />{item.subscriber_count} підписників
        </span>
      </div>
    </div>
  )
}

// --- User Result Card ---

function UserResultCard({ item }: { item: SearchUser }) {
  const navigate = useNavigate()
  return (
    <div
      className="card p-3.5 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3"
      onClick={() => navigate(`/users/${item.id}`)}
    >
      <Avatar name={item.display_name} size={40} avatarUrl={item.avatar_url || null} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-slate-900 truncate">
            {item.display_name}
          </span>
          {item.is_private && <Icon name="layers" size={12} stroke="#94A3B8" />}
        </div>
        {item.bio && <p className="text-xs text-slate-500 truncate">{item.bio}</p>}
      </div>
      <Icon name="chevron-right" size={16} stroke="#CBD5E1" />
    </div>
  )
}

// --- Tags Filter ---

interface TagsFilterProps {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

function TagsFilter({ tags, onAdd, onRemove }: TagsFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      onAdd(e.currentTarget.value.trim().replace(/^#/, ''))
      e.currentTarget.value = ''
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 mb-3 px-4">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-medium"
        >
          #{tag}
          <button
            onClick={() => onRemove(tag)}
            className="flex items-center opacity-70 hover:opacity-100 transition-opacity"
          >
            <Icon name="x" size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        placeholder="+ тег"
        className="text-xs outline-none text-slate-600 min-w-[60px] bg-transparent"
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

// --- Main Page ---

const TABS: { label: string; value: SearchType }[] = [
  { label: 'Метки', value: 'markers' },
  { label: 'Картки', value: 'cards' },
  { label: 'Люди', value: 'users' },
]

const PAGE_SIZE = 20

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialQ = searchParams.get('q') ?? ''
  const initialType = (searchParams.get('type') as SearchType) ?? 'markers'

  const [query, setQuery] = useState(initialQ)
  const [activeTab, setActiveTab] = useState<SearchType>(initialType)
  const [tags, setTags] = useState<string[]>([])

  // Results state
  const [markers, setMarkers] = useState<SearchMarker[]>([])
  const [cards, setCards] = useState<SearchCard[]>([])
  const [users, setUsers] = useState<SearchUser[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = { type: activeTab }
    if (query) params.q = query
    setSearchParams(params, { replace: true })
  }, [query, activeTab, setSearchParams])

  // Fetch function
  const fetchResults = useCallback(
    async (q: string, type: SearchType, activeTags: string[], currentOffset: number, append: boolean) => {
      if (!q.trim()) return

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(false)
      }

      try {
        if (type === 'markers') {
          const res = await searchApi.searchMarkers(q, activeTags, PAGE_SIZE, currentOffset)
          setMarkers((prev) => (append ? [...prev, ...res.data.items] : res.data.items))
          setTotal(res.data.total)
        } else if (type === 'cards') {
          const res = await searchApi.searchCards(q, PAGE_SIZE, currentOffset)
          setCards((prev) => (append ? [...prev, ...res.data.items] : res.data.items))
          setTotal(res.data.total)
        } else {
          const res = await searchApi.searchUsers(q, PAGE_SIZE, currentOffset)
          setUsers((prev) => (append ? [...prev, ...res.data.items] : res.data.items))
          setTotal(res.data.total)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [],
  )

  // Debounced search on query/tab/tags change
  useEffect(() => {
    if (!query.trim()) {
      setMarkers([])
      setCards([])
      setUsers([])
      setTotal(0)
      setOffset(0)
      setError(false)
      return
    }

    setOffset(0)

    const timer = setTimeout(() => {
      fetchResults(query, activeTab, tags, 0, false)
    }, 400)

    return () => clearTimeout(timer)
  }, [query, activeTab, tags, fetchResults])

  // Load more
  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchResults(query, activeTab, tags, newOffset, true)
  }

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) setTags((prev) => [...prev, tag])
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleTabChange = (tab: SearchType) => {
    setActiveTab(tab)
    setOffset(0)
    setError(false)
  }

  const currentItems =
    activeTab === 'markers' ? markers : activeTab === 'cards' ? cards : users
  const hasMore = currentItems.length < total

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-md px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <Icon name="chevron-right" size={20} stroke="#64748B" className="rotate-180" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">Пошук</span>
      </div>

      {/* Search input */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex-shrink-0">
        <div className="relative flex items-center">
          <Icon name="search" size={16} stroke="#94A3B8" className="absolute left-3 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук меток, карт, людей…"
            className="input w-full pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 flex transition-colors"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 flex gap-0 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tags filter (markers only) */}
      {activeTab === 'markers' && (
        <div className="bg-white border-b border-slate-100 pt-2.5 pb-1 flex-shrink-0">
          <TagsFilter tags={tags} onAdd={addTag} onRemove={removeTag} />
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty query state */}
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Icon name="search" size={48} stroke="#CBD5E1" />
            <p className="mt-4 text-[15px] font-medium text-slate-500">Введіть запит для пошуку</p>
            <p className="mt-1 text-sm text-slate-400">Шукайте метки, картки та людей</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && query.trim() && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Icon name="alert-circle" size={40} stroke="#FDA4AF" />
            <p className="mt-3 text-[15px] font-medium text-slate-600">Помилка пошуку. Спробуйте ще раз.</p>
            <button
              onClick={() => fetchResults(query, activeTab, tags, 0, false)}
              className="mt-3 px-4 py-2 btn-primary text-sm"
            >
              Повторити
            </button>
          </div>
        )}

        {/* Zero results */}
        {!loading && !error && query.trim() && currentItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Icon name="search" size={40} stroke="#CBD5E1" />
            <p className="mt-3 text-[15px] font-medium text-slate-600">
              Нічого не знайдено за запитом «{query}»
            </p>
          </div>
        )}

        {/* Results list */}
        {!loading && !error && currentItems.length > 0 && (
          <div className="space-y-3">
            {activeTab === 'markers' &&
              markers.map((item) => <MarkerResultCard key={item.id} item={item} />)}
            {activeTab === 'cards' &&
              cards.map((item) => <CardResultCard key={item.id} item={item} />)}
            {activeTab === 'users' &&
              users.map((item) => <UserResultCard key={item.id} item={item} />)}

            {/* Load more */}
            {hasMore && (
              <div className="pt-2 pb-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Завантаження…' : 'Показати ще'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
