import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocialStore } from '@/store/social'
import type { BlockedItem } from '@/api/users'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'

export default function BlockedSettingsPage() {
  const navigate = useNavigate()
  const { blocked, blockedLoading, fetchBlocked, unblockUser, unblockCard } = useSocialStore()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBlocked()
  }, [fetchBlocked])

  const handleUnblockUser = async (item: BlockedItem) => {
    setPendingId(item.target_id)
    setError(null)
    try {
      await unblockUser(item.target_id)
    } catch {
      setError('Не удалось разблокировать пользователя')
    } finally {
      setPendingId(null)
    }
  }

  const handleUnblockCard = async (item: BlockedItem) => {
    setPendingId(item.target_id)
    setError(null)
    try {
      await unblockCard(item.target_id)
    } catch {
      setError('Не удалось разблокировать карту')
    } finally {
      setPendingId(null)
    }
  }

  const blockedUsers = blocked?.blocked_users ?? []
  const blockedCards = blocked?.blocked_cards ?? []
  const isEmpty = blockedUsers.length === 0 && blockedCards.length === 0

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top nav */}
      <div className="sticky top-0 z-[150] bg-white/95 backdrop-blur-md shadow-md px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost p-2 -ml-2"
          aria-label="Назад"
        >
          <Icon name="chevron-right" size={20} className="rotate-180" />
        </button>
        <h1 className="text-h3 font-semibold text-slate-900">Заблокированные</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-danger flex items-center gap-2">
            <Icon name="alert-circle" size={16} stroke="#EF4444" />
            {error}
          </div>
        )}

        {blockedLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="card p-12 text-center">
            <Icon name="check" size={40} stroke="#10B981" className="mx-auto mb-4" />
            <p className="text-h3 font-semibold text-slate-700 mb-1">Список пуст</p>
            <p className="text-slate-500 text-[15px]">Вы никого не заблокировали</p>
          </div>
        ) : (
          <>
            {/* Blocked users */}
            {blockedUsers.length > 0 && (
              <section>
                <h2 className="text-label text-slate-500 mb-3 px-1">
                  Пользователи ({blockedUsers.length})
                </h2>
                <div className="space-y-2">
                  {blockedUsers.map((item) => (
                    <BlockedUserRow
                      key={item.id}
                      item={item}
                      pending={pendingId === item.target_id}
                      onUnblock={handleUnblockUser}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Blocked cards */}
            {blockedCards.length > 0 && (
              <section>
                <h2 className="text-label text-slate-500 mb-3 px-1">
                  Карты ({blockedCards.length})
                </h2>
                <div className="space-y-2">
                  {blockedCards.map((item) => (
                    <BlockedCardRow
                      key={item.id}
                      item={item}
                      pending={pendingId === item.target_id}
                      onUnblock={handleUnblockCard}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Sub-components

interface BlockedUserRowProps {
  item: BlockedItem
  pending: boolean
  onUnblock: (item: BlockedItem) => void
}

function BlockedUserRow({ item, pending, onUnblock }: BlockedUserRowProps) {
  const name = item.display_name ?? 'Пользователь'
  const hue = name.charCodeAt(0) % 5

  return (
    <div className="card p-4 flex items-center gap-3">
      <Avatar
        name={name}
        size={40}
        avatarUrl={item.avatar_url}
        hue={hue}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">{name}</p>
        <p className="text-caption text-slate-400">
          Заблокирован {new Date(item.created_at).toLocaleDateString('uk-UA')}
        </p>
      </div>
      <button
        onClick={() => onUnblock(item)}
        disabled={pending}
        className="btn-secondary text-sm py-1.5 px-3"
      >
        {pending ? (
          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          'Разблокировать'
        )}
      </button>
    </div>
  )
}

interface BlockedCardRowProps {
  item: BlockedItem
  pending: boolean
  onUnblock: (item: BlockedItem) => void
}

function BlockedCardRow({ item, pending, onUnblock }: BlockedCardRowProps) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon name="layers" size={20} stroke="#64748B" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">{item.title ?? 'Карта'}</p>
        <p className="text-caption text-slate-400">
          Заблокирована {new Date(item.created_at).toLocaleDateString('uk-UA')}
        </p>
      </div>
      <button
        onClick={() => onUnblock(item)}
        disabled={pending}
        className="btn-secondary text-sm py-1.5 px-3"
      >
        {pending ? (
          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          'Разблокировать'
        )}
      </button>
    </div>
  )
}
