import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useSocialStore } from '@/store/social'
import { cardsApi, type Card } from '@/api/cards'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import PrivacyBadge from '@/components/ui/PrivacyBadge'
import BlockModal from '@/components/Social/BlockModal'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  const { fetchProfile, profile, profileLoading, profileError, subscriptions, fetchMySubscriptions, subscribeToCard, unsubscribeFromCard, blockUser } = useSocialStore()

  const [userCards, setUserCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isOwnProfile = currentUser?.id === id

  useEffect(() => {
    if (!id) return
    fetchProfile(id)
    fetchMySubscriptions()
  }, [id, fetchProfile, fetchMySubscriptions])

  useEffect(() => {
    if (!id) return
    setCardsLoading(true)
    cardsApi.listByOwner(id)
      .then(({ data }) => setUserCards(data.cards ?? []))
      .catch(() => setUserCards([]))
      .finally(() => setCardsLoading(false))
  }, [id])

  // Find subscription to one of this user's cards
  const subscriptionForUserCard = subscriptions.find((sub) =>
    userCards.some((c) => c.id === sub.card_id)
  )
  const isFollowing = Boolean(subscriptionForUserCard)

  const handleFollow = async () => {
    if (!userCards.length) return
    setActionLoading(true)
    setActionError(null)
    try {
      // Subscribe to the first public card of this user
      const publicCard = userCards.find((c) => c.is_public)
      if (!publicCard) {
        setActionError('Нет публичных карт для подписки')
        return
      }
      await subscribeToCard(publicCard.id)
    } catch {
      setActionError('Не удалось подписаться')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (!subscriptionForUserCard) return
    setActionLoading(true)
    setActionError(null)
    try {
      await unsubscribeFromCard(subscriptionForUserCard.id)
    } catch {
      setActionError('Не удалось отписаться')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBlockUser = async () => {
    if (!id) return
    await blockUser(id)
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Icon name="alert-circle" size={40} stroke="#EF4444" />
        <p className="text-slate-600">{profileError ?? 'Пользователь не найден'}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          ← Назад
        </button>
      </div>
    )
  }

  const hue = profile.display_name.charCodeAt(0) % 5

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
        <h1 className="text-h3 font-semibold text-slate-900 truncate flex-1">
          {profile.display_name}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Profile card */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <Avatar
              name={profile.display_name}
              size={72}
              avatarUrl={profile.avatar_url}
              hue={hue}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-h2 font-bold text-slate-900">{profile.display_name}</h2>
              {profile.bio && (
                <p className="text-[15px] text-slate-600 mt-1">{profile.bio}</p>
              )}

              {/* Counters */}
              {!profile.is_private && (
                <div className="flex gap-5 mt-3">
                  <div className="text-center">
                    <p className="font-mono text-h3 font-bold text-slate-900">{profile.card_count ?? userCards.length}</p>
                    <p className="text-caption text-slate-500">карт</p>
                  </div>
                  {profile.subscriber_count !== undefined && (
                    <div className="text-center">
                      <p className="font-mono text-h3 font-bold text-slate-900">{profile.subscriber_count}</p>
                      <p className="text-caption text-slate-500">подписчиков</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons for other profiles */}
          {!isOwnProfile && (
            <div className="flex gap-3 mt-5">
              {isFollowing ? (
                <button
                  onClick={handleUnfollow}
                  disabled={actionLoading}
                  className="btn-secondary flex-1"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Icon name="check" size={16} />
                      Подписан
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  disabled={actionLoading}
                  className="btn-primary flex-1"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Icon name="plus" size={16} />
                      Подписаться
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowBlockModal(true)}
                className="btn-ghost text-danger border border-slate-200 px-4"
                title="Заблокировать"
              >
                <Icon name="alert-circle" size={16} stroke="#EF4444" />
              </button>
            </div>
          )}

          {actionError && (
            <p className="text-sm text-danger mt-2">{actionError}</p>
          )}
        </div>

        {/* User's public cards */}
        {!profile.is_private && (
          <div>
            <h3 className="text-h3 font-semibold text-slate-900 mb-3">Публичные карты</h3>

            {cardsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userCards.filter((c) => c.is_public).length === 0 ? (
              <div className="card p-8 text-center">
                <Icon name="layers" size={32} stroke="#94A3B8" className="mx-auto mb-3" />
                <p className="text-slate-500">Нет публичных карт</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userCards
                  .filter((c) => c.is_public)
                  .map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      onClick={() => navigate(`/cards/${card.id}`)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <BlockModal
          userName={profile.display_name}
          userId={id}
          onBlockUser={handleBlockUser}
          onClose={() => setShowBlockModal(false)}
        />
      )}
    </div>
  )
}

// Sub-component
interface CardItemProps {
  card: Card
  onClick: () => void
}

function CardItem({ card, onClick }: CardItemProps) {
  return (
    <div
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 truncate">{card.title}</h4>
          {card.description && (
            <p className="text-caption text-slate-500 mt-0.5 line-clamp-2">{card.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <PrivacyBadge value={card.is_public ? 'PUBLIC' : 'PRIVATE'} />
            <span className="text-caption text-slate-400">
              {new Date(card.created_at).toLocaleDateString('uk-UA')}
            </span>
          </div>
        </div>
        <Icon name="chevron-right" size={18} stroke="#94A3B8" />
      </div>
    </div>
  )
}
