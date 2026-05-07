import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSidebarStore, type SidebarPanel } from '@/store/sidebar'
import { useAuthStore } from '@/store/auth'
import { useCardsStore } from '@/store/cards'
import { useSocialStore } from '@/store/social'
import { subscriptionsApi, type Subscription, type BlockedItem } from '@/api/users'
import { feedApi, type FeedItem } from '@/api/feed'
import { heatColor } from './ui/MarkerPin'
import Icon from './ui/Icon'
import Avatar from './ui/Avatar'
import CreateCardModal from './CreateCardModal'
import type { Card } from '@/api/cards'

// ---------------------------------------------------------------------------
// Panel metadata
// ---------------------------------------------------------------------------

const PANEL_TITLE: Record<SidebarPanel, string> = {
  feed: 'Стрічка активності',
  'my-cards': 'Мої картки',
  subscriptions: 'Підписки',
  blocked: 'Заблоковані',
}

const PANEL_ICON: Record<SidebarPanel, string> = {
  feed: 'list',
  'my-cards': 'map-pin',
  subscriptions: 'heart',
  blocked: 'alert-circle',
}

// ---------------------------------------------------------------------------
// FeedPanel
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'щойно'
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`
  return `${Math.floor(diff / 86400)} дн тому`
}

function FeedPanel() {
  const navigate = useNavigate()
  const { closePanel } = useSidebarStore()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nextCursorRef = useRef<string | null>(null)
  const nextBeforeIdRef = useRef<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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
      if (!data.next_cursor || (data.items ?? []).length === 0) setHasMore(false)
    } catch {
      setError('Не вдалося завантажити стрічку')
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [loading, hasMore])

  useEffect(() => { loadMore() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  if (initialLoad) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg bg-slate-100 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        <p className="mb-3">{error}</p>
        <button
          onClick={() => { setHasMore(true); setError(null); loadMore() }}
          className="text-brand-600 font-medium hover:underline"
        >
          Спробувати ще
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="p-8 text-center text-slate-400 text-sm">Стрічка поки порожня</p>
  }

  return (
    <div className="p-3 space-y-3">
      {items.map((item) => {
        const { marker, card, actor } = item
        const photo = marker.photo_urls?.[0] ?? null
        return (
          <div
            key={item.id}
            onClick={() => { navigate(`/cards/${card.id}`); closePanel() }}
            className="border border-slate-100 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {photo && (
              <img src={photo} alt={marker.title} className="w-full h-32 object-cover" />
            )}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[14px] font-semibold text-slate-900 truncate">{marker.title}</span>
                <span
                  className="text-[10px] font-bold font-mono rounded-full px-1.5 py-0.5 text-white flex-shrink-0"
                  style={{ background: heatColor(marker.like_weight) }}
                >
                  {marker.like_weight >= 0 ? '+' : ''}{marker.like_weight}
                </span>
              </div>
              {marker.description && (
                <p className="text-xs text-slate-500 mb-1.5 line-clamp-2">{marker.description}</p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Avatar name={actor.display_name || '?'} size={18} avatarUrl={actor.avatar_url || null} />
                <span className="truncate">{actor.display_name}</span>
                <span className="flex-shrink-0">· {timeAgo(item.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={sentinelRef} className="flex justify-center py-3">
        {loading && (
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
        {!hasMore && !loading && (
          <p className="text-xs text-slate-400">Нових записів немає</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MyCardsPanel
// ---------------------------------------------------------------------------

function MyCardsPanel() {
  const navigate = useNavigate()
  const { closePanel } = useSidebarStore()
  const user = useAuthStore((s) => s.user)
  const { myCards, loading, fetchMyCards, deleteCard } = useCardsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchMyCards(user.id)
  }, [user, fetchMyCards])

  return (
    <div className="p-3">
      <button
        onClick={() => setShowCreate(true)}
        className="w-full mb-3 py-2 flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl text-[13px] font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        <Icon name="plus" size={15} />
        Нова картка
      </button>

      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && myCards.length === 0 && (
        <p className="py-8 text-center text-slate-400 text-sm">У вас ще немає карток</p>
      )}

      <div className="space-y-2">
        {myCards.map((card) => (
          <div
            key={card.id}
            className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => { navigate(`/cards/${card.id}`); closePanel() }}
            >
              <p className="text-[14px] font-semibold text-slate-900 truncate">{card.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {card.is_public ? 'Публічна' : 'Приватна'}
              </p>
            </div>
            {confirmId === card.id ? (
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => { deleteCard(card.id); setConfirmId(null) }}
                  className="text-xs text-red-600 font-medium hover:underline"
                >
                  Видалити
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-xs text-slate-400 hover:underline"
                >
                  Скасувати
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(card.id)}
                className="text-slate-300 hover:text-red-400 flex-shrink-0 p-1 transition-colors"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateCardModal
          onClose={() => setShowCreate(false)}
          onCreated={(card: Card) => {
            setShowCreate(false)
            useCardsStore.setState((s) => ({ myCards: [card, ...s.myCards] }))
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubscriptionsPanel
// ---------------------------------------------------------------------------

function SubscriptionsPanel() {
  const navigate = useNavigate()
  const { closePanel } = useSidebarStore()
  const [cards, setCards] = useState<Subscription[]>([])
  const [users, setUsers] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionsApi.getMySubscriptions()
      .then((res) => {
        setCards(res.data.cards ?? [])
        setUsers(res.data.users ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (cards.length === 0 && users.length === 0) {
    return <p className="p-8 text-center text-slate-400 text-sm">Підписок ще немає</p>
  }

  return (
    <div className="p-3 space-y-4">
      {cards.length > 0 && (
        <section>
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2 px-1">
            Картки
          </p>
          <div className="space-y-1.5">
            {cards.map((s) => (
              <div
                key={s.id}
                onClick={() => { navigate(`/cards/${s.target_card_id}`); closePanel() }}
                className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Icon name="layers" size={16} stroke="#6366F1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">
                    {s.card?.title ?? s.target_card_id}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(s.created_at).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <Icon name="chevron-right" size={14} stroke="#CBD5E1" />
              </div>
            ))}
          </div>
        </section>
      )}

      {users.length > 0 && (
        <section>
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2 px-1">
            Користувачі
          </p>
          <div className="space-y-1.5">
            {users.map((s) => (
              <div
                key={s.id}
                onClick={() => { navigate(`/users/${s.target_user_id}`); closePanel() }}
                className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <Icon name="user" size={16} stroke="#64748B" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">
                    {s.target_user_id}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(s.created_at).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <Icon name="chevron-right" size={14} stroke="#CBD5E1" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BlockedPanel
// ---------------------------------------------------------------------------

function BlockedPanel() {
  const { blocked, blockedLoading, fetchBlocked, unblockUser, unblockCard } = useSocialStore()
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => { fetchBlocked() }, [fetchBlocked])

  const handleUnblock = async (item: BlockedItem, type: 'user' | 'card') => {
    setPendingId(item.target_id)
    try {
      if (type === 'user') await unblockUser(item.target_id)
      else await unblockCard(item.target_id)
    } finally {
      setPendingId(null)
    }
  }

  if (blockedLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const blockedUsers = blocked?.blocked_users ?? []
  const blockedCards = blocked?.blocked_cards ?? []

  if (blockedUsers.length === 0 && blockedCards.length === 0) {
    return <p className="p-8 text-center text-slate-400 text-sm">Список порожній</p>
  }

  const renderRow = (item: BlockedItem, type: 'user' | 'card') => (
    <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
      {type === 'user' ? (
        <Avatar name={item.display_name ?? '?'} size={36} avatarUrl={item.avatar_url} />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon name="layers" size={18} stroke="#64748B" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 truncate">
          {type === 'user' ? (item.display_name ?? 'Користувач') : (item.title ?? 'Картка')}
        </p>
        <p className="text-[11px] text-slate-400">
          {new Date(item.created_at).toLocaleDateString('uk-UA')}
        </p>
      </div>
      <button
        onClick={() => handleUnblock(item, type)}
        disabled={pendingId === item.target_id}
        className="text-xs font-medium text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-300 disabled:opacity-40 transition-colors flex-shrink-0"
      >
        {pendingId === item.target_id ? (
          <span className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
        ) : (
          'Розблокувати'
        )}
      </button>
    </div>
  )

  return (
    <div className="p-3 space-y-4">
      {blockedUsers.length > 0 && (
        <section>
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2 px-1">
            Користувачі ({blockedUsers.length})
          </p>
          <div className="space-y-1.5">
            {blockedUsers.map((item) => renderRow(item, 'user'))}
          </div>
        </section>
      )}
      {blockedCards.length > 0 && (
        <section>
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2 px-1">
            Картки ({blockedCards.length})
          </p>
          <div className="space-y-1.5">
            {blockedCards.map((item) => renderRow(item, 'card'))}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppSidebar
// ---------------------------------------------------------------------------

export default function AppSidebar() {
  const { panel, closePanel } = useSidebarStore()

  useEffect(() => {
    if (!panel) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [panel, closePanel])

  if (!panel) return null

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px]" onClick={closePanel} />
      <div className="fixed top-0 right-0 bottom-0 z-[201] w-[420px] max-w-full bg-white shadow-xl flex flex-col animate-[slideRight_280ms_cubic-bezier(0.2,0,0,1)]">
        {/* Header */}
        <div className="px-5 h-14 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
          <Icon name={PANEL_ICON[panel]} size={18} stroke="#EF4444" />
          <span className="text-[17px] font-bold text-slate-900 flex-1">{PANEL_TITLE[panel]}</span>
          <button
            onClick={closePanel}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {panel === 'feed' && <FeedPanel />}
          {panel === 'my-cards' && <MyCardsPanel />}
          {panel === 'subscriptions' && <SubscriptionsPanel />}
          {panel === 'blocked' && <BlockedPanel />}
        </div>
      </div>
    </>
  )
}
