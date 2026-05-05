import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useCardsStore } from '@/store/cards'
import CreateCardModal from '@/components/Cards/CreateCardModal'
import { type Card } from '@/api/cards'

function CardItem({ card, onDelete }: { card: Card; onDelete: (id: string) => void }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/cards/${card.id}`)}
        >
          <h3 className="font-semibold text-gray-900 truncate">{card.title}</h3>
          {card.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{card.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {card.is_public ? 'Публичная' : 'Приватная'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(card.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0">
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(card.id)}
                className="text-xs text-red-600 font-medium hover:underline"
              >
                Удалить
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-gray-400 hover:text-red-500 p-1"
              title="Удалить карту"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyCardsPage() {
  const user = useAuthStore((s) => s.user)
  const { myCards, loading, error, fetchMyCards, createCard, deleteCard } = useCardsStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (user) fetchMyCards(user.id)
  }, [user, fetchMyCards])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Мои карты</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать карту
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && myCards.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">Нет карт</p>
            <p className="text-sm mt-1">Создайте первую карту, чтобы добавлять метки</p>
          </div>
        )}

        <div className="space-y-3">
          {myCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={deleteCard}
            />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateCardModal
          onClose={() => setShowCreate(false)}
          onCreate={createCard}
        />
      )}
    </div>
  )
}
