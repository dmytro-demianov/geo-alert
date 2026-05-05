import { useState } from 'react'
import Icon from '@/components/ui/Icon'

interface BlockModalProps {
  userName?: string
  cardTitle?: string
  userId?: string
  cardId?: string
  onBlockUser?: () => Promise<void>
  onBlockCard?: () => Promise<void>
  onClose: () => void
}

export default function BlockModal({
  userName,
  cardTitle,
  userId,
  cardId,
  onBlockUser,
  onBlockCard,
  onClose,
}: BlockModalProps) {
  const [choice, setChoice] = useState<'user' | 'card'>(userId ? 'user' : 'card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canBlockUser = Boolean(userId && onBlockUser)
  const canBlockCard = Boolean(cardId && onBlockCard)

  const handleConfirm = async () => {
    setError(null)
    setLoading(true)
    try {
      if (choice === 'user' && onBlockUser) {
        await onBlockUser()
      } else if (choice === 'card' && onBlockCard) {
        await onBlockCard()
      }
      onClose()
    } catch {
      setError('Не удалось заблокировать. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl shadow-md w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-h3 font-semibold text-slate-900">Заблокировать</h2>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 -mr-1.5"
            aria-label="Закрыть"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Radio options */}
        <div className="space-y-3 mb-6">
          {canBlockUser && (
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                choice === 'user'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="block-choice"
                value="user"
                checked={choice === 'user'}
                onChange={() => setChoice('user')}
                className="accent-brand-500"
              />
              <div>
                <p className="text-[15px] font-medium text-slate-900">Заблокировать пользователя</p>
                {userName && (
                  <p className="text-caption text-slate-500 mt-0.5">{userName}</p>
                )}
              </div>
            </label>
          )}

          {canBlockCard && (
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                choice === 'card'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="block-choice"
                value="card"
                checked={choice === 'card'}
                onChange={() => setChoice('card')}
                className="accent-brand-500"
              />
              <div>
                <p className="text-[15px] font-medium text-slate-900">Заблокировать карту</p>
                {cardTitle && (
                  <p className="text-caption text-slate-500 mt-0.5">{cardTitle}</p>
                )}
              </div>
            </label>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            className="btn-primary flex-1 bg-danger hover:bg-red-600 active:bg-red-700"
            disabled={loading}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Заблокировать'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
