import { useState, useRef } from 'react'
import {
  markersApi,
  type MarkerData,
  type CreateMarkerPayload,
  type NotificationType,
} from '@/api/markers'

interface Props {
  cardId: string
  latitude: number
  longitude: number
  onClose: () => void
  onCreated: (marker: MarkerData) => void
}

type ExpirationOption = 'ETERNAL' | 'UNTIL_TIME' | 'END_OF_DAY'

interface ImagePreview {
  file: File
  previewUrl: string
}

interface NearbyDialogProps {
  nearbyMarkers: MarkerData[]
  onView: (marker: MarkerData) => void
  onLike: (marker: MarkerData) => void
  onComment: (marker: MarkerData) => void
  onCreateOwn: () => void
}

function NearbyMarkersDialog({
  nearbyMarkers,
  onView,
  onLike,
  onComment,
  onCreateOwn,
}: NearbyDialogProps) {
  const first = nearbyMarkers[0]
  return (
    <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-2xl">
      <div className="bg-white rounded-xl shadow-xl mx-4 p-6 max-w-sm w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          В радиусе 200м уже есть метка
        </h3>
        <p className="text-sm text-gray-700 mb-4 bg-gray-50 rounded px-3 py-2">
          &ldquo;{first.title}&rdquo;
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onView(first)}
            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Посмотреть
          </button>
          <button
            onClick={() => onLike(first)}
            className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Лайкнуть
          </button>
          <button
            onClick={() => onComment(first)}
            className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Комментировать
          </button>
          <button
            onClick={onCreateOwn}
            className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Создать свою
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreateMarkerModal({
  cardId,
  latitude,
  longitude,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [expirationOption, setExpirationOption] = useState<ExpirationOption>('ETERNAL')
  const [expiresAt, setExpiresAt] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [allowLikes, setAllowLikes] = useState(true)
  const [isDraft, setIsDraft] = useState(false)
  const [notificationType, setNotificationType] = useState<NotificationType>('ON_ENTER')
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nearbyMarkers, setNearbyMarkers] = useState<MarkerData[]>([])
  const [createdMarker, setCreatedMarker] = useState<MarkerData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags((prev) => [...prev, trimmed])
      setTagInput('')
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const previews = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setImagePreviews((prev) => [...prev, ...previews])
    // Reset input so same files can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].previewUrl)
      updated.splice(index, 1)
      return updated
    })
  }

  const buildPayload = (): CreateMarkerPayload => {
    const payload: CreateMarkerPayload = {
      title: title.trim(),
      latitude,
      longitude,
      allow_comments: allowComments,
      allow_likes: allowLikes,
      is_draft: isDraft,
      notification_type: notificationType,
    }

    if (description.trim()) {
      payload.description = description.trim()
    }
    if (tags.length > 0) {
      payload.tags = tags
    }

    if (expirationOption === 'ETERNAL') {
      payload.expiration_type = 'ETERNAL'
    } else if (expirationOption === 'END_OF_DAY') {
      payload.expiration_type = 'END_OF_DAY'
    } else if (expirationOption === 'UNTIL_TIME' && expiresAt) {
      payload.expiration_type = 'UNTIL_TIME'
      payload.expires_at = new Date(expiresAt).toISOString()
    }

    // TODO: upload images to Firebase Storage and set payload.images
    // For now, images are stored in local state only (see imagePreviews)

    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await markersApi.create(cardId, buildPayload())
      const marker = res.data
      setCreatedMarker(marker)
      if (marker.nearby_markers && marker.nearby_markers.length > 0) {
        setNearbyMarkers(marker.nearby_markers)
      } else {
        onCreated(marker)
      }
    } catch {
      setError('Не удалось создать метку')
    } finally {
      setSubmitting(false)
    }
  }

  // Nearby dialog handlers
  // _marker: the nearby marker the user chose to view; CardPage handles selection via onCreated callback
  const handleViewNearby = (_marker: MarkerData) => {
    onCreated(createdMarker!)
    onClose()
  }

  const handleLikeNearby = (_marker: MarkerData) => {
    // TODO: call likes API when TASK-2.3 is done
    console.warn('TODO: like marker', _marker.id)
  }

  const handleCommentNearby = (_marker: MarkerData) => {
    // TODO: open comments when TASK-2.4 is done
    console.warn('TODO: comment marker', _marker.id)
  }

  const handleCreateOwn = () => {
    if (createdMarker) {
      onCreated(createdMarker)
    }
    setNearbyMarkers([])
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Nearby markers overlay */}
        {nearbyMarkers.length > 0 && (
          <NearbyMarkersDialog
            nearbyMarkers={nearbyMarkers}
            onView={handleViewNearby}
            onLike={handleLikeNearby}
            onComment={handleCommentNearby}
            onCreateOwn={handleCreateOwn}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Новая метка</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Coordinates badge */}
        <div className="px-5 pt-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Название метки"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-0.5 text-right">{title.length}/200</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Необязательное описание"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Теги <span className="text-gray-400 font-normal">(макс. 5)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Добавить тег"
                  disabled={tags.length >= 5}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 5}
                  className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-400 hover:text-blue-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* TTL picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Время жизни</label>
              <select
                value={expirationOption}
                onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ETERNAL">Вечная</option>
                <option value="UNTIL_TIME">До конкретного времени</option>
                <option value="END_OF_DAY">До конца дня</option>
              </select>
              {expirationOption === 'UNTIL_TIME' && (
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фото</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-center"
              >
                Выбрать фото
                <span className="block text-xs text-gray-400 mt-0.5">
                  (загрузка на сервер — TODO: Firebase Storage)
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imagePreviews.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.previewUrl}
                        alt={`preview-${idx}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings (collapsible) */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>Настройки</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
                  {/* allow_comments */}
                  <ToggleRow
                    label="Разрешить комментарии"
                    value={allowComments}
                    onChange={setAllowComments}
                  />
                  {/* allow_likes */}
                  <ToggleRow
                    label="Разрешить лайки"
                    value={allowLikes}
                    onChange={setAllowLikes}
                  />
                  {/* is_draft */}
                  <ToggleRow
                    label="Черновик"
                    value={isDraft}
                    onChange={setIsDraft}
                  />
                  {/* notification_type */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Тип уведомления</label>
                    <select
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ON_ENTER">При входе в зону</option>
                      <option value="ON_APPROACH">При приближении</option>
                      <option value="BOTH">Оба варианта</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Helper sub-components ---

interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}
