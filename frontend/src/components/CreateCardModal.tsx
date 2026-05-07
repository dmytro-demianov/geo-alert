import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cardsApi, type CreateCardPayload } from '@/api/cards'
import Icon from './ui/Icon'

interface Props {
  onClose: () => void
  onCreated?: () => void
}

export default function CreateCardModal({ onClose, onCreated }: Props) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const payload: CreateCardPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      }
      const { data } = await cardsApi.create(payload)
      if (onCreated) {
        onCreated()
      } else {
        onClose()
        navigate(`/cards/${data.id}`)
      }
    } catch {
      setError('Не вдалося створити картку. Спробуйте ще раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-h3 text-slate-900">Нова картка</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-slate-500">Назва</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Цікаві місця Києва"
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-slate-500">Опис <span className="text-slate-400 font-normal normal-case tracking-normal">(необов'язково)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Коротко про що ця картка..."
              maxLength={500}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-2.5 px-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div>
              <div className="text-sm font-medium text-slate-900">Публічна картка</div>
              <div className="text-xs text-slate-500 mt-0.5">Буде видна всім користувачам</div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-brand-500' : 'bg-slate-300'}`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="w-full h-11 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Створення...' : 'Створити та додати метки'}
          </button>
        </form>
      </div>
    </div>
  )
}
