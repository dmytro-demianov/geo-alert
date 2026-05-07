import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionsApi, type Subscription } from '@/api/users'

export default function SubscriptionsPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<Subscription[]>([])
  const [users, setUsers] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionsApi
      .getMySubscriptions()
      .then((res) => {
        setCards(res.data.cards ?? [])
        setUsers(res.data.users ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 hover:underline mb-6 block"
      >
        ← Назад
      </button>

      <h1 className="text-xl font-bold text-slate-900 mb-6">Підписки</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && cards.length === 0 && users.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-12">Підписок ще немає</p>
      )}

      {cards.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Картки</h2>
          <div className="space-y-2">
            {cards.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/cards/${s.target_card_id}`)}
                className="p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {s.card?.title ?? s.target_card_id}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('uk-UA')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {users.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Користувачі</h2>
          <div className="space-y-2">
            {users.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/users/${s.target_user_id}`)}
                className="p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">{s.target_user_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('uk-UA')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
