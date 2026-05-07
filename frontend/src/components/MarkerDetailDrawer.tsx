import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './ui/Icon'
import { heatColor } from './ui/MarkerPin'
import { type MarkerData, type ExpirationType, type LikeType, type ReportReason, type Comment, markersApi } from '@/api/markers'
import { type UserProfile } from '@/api/users'
import { apiClient } from '@/api/client'
import { wsClient } from '@/ws/client'

// ---------------------------------------------------------------------------
// TTL helpers (local, replicating logic from CardPage)
// ---------------------------------------------------------------------------

function formatTtl(ms: number): string {
  if (ms <= 0) return 'Истекла'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (days > 0) return `${days}д ${hours}ч`
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function useTtlCountdown(
  expirationType: ExpirationType,
  expiresAt: string | null,
): { label: string; expired: boolean; critical: boolean } {
  const [remaining, setRemaining] = useState<number>(() => {
    if (expirationType === 'ETERNAL' || !expiresAt) return -1
    return new Date(expiresAt).getTime() - Date.now()
  })

  useEffect(() => {
    if (expirationType === 'ETERNAL' || !expiresAt) return
    const target = new Date(expiresAt).getTime()
    const tick = () => setRemaining(target - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expirationType, expiresAt])

  if (expirationType === 'ETERNAL' || remaining < 0) {
    return { label: '', expired: false, critical: false }
  }

  return {
    label: formatTtl(remaining),
    expired: remaining <= 0,
    critical: remaining > 0 && remaining < 10 * 60 * 1000,
  }
}

// ---------------------------------------------------------------------------
// Time-ago helper
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'тільки що'
  if (minutes < 60) return `${minutes} хв тому`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} год тому`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} дн тому`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} міс тому`
  return `${Math.floor(months / 12)} р тому`
}

// ---------------------------------------------------------------------------
// Photo gallery sub-component
// ---------------------------------------------------------------------------

interface PhotoGalleryProps {
  photos: string[]
}

function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="h-[200px] bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Icon name="image" size={40} strokeWidth={1.5} />
        <span className="text-sm">Нет фото</span>
      </div>
    )
  }

  const prev = () => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setCurrentIndex((i) => (i + 1) % photos.length)

  return (
    <div className="relative h-[220px] bg-slate-900 overflow-hidden">
      <img
        src={photos[currentIndex]}
        alt={`Фото ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Counter */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-white text-xs font-mono font-semibold">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Prev / Next buttons (only if more than one photo) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-900 hover:bg-white transition-colors shadow-sm"
            aria-label="Попереднє фото"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-900 hover:bg-white transition-colors shadow-sm"
            aria-label="Наступне фото"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-white' : 'bg-white/40'
                }`}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReportModal sub-component
// ---------------------------------------------------------------------------

interface ReportModalProps {
  markerId: string
  onClose: () => void
}

function ReportModal({ markerId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const reasons: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: 'Спам або реклама' },
    { value: 'inappropriate', label: 'Непристойний контент' },
    { value: 'misinformation', label: 'Неправдива інформація' },
    { value: 'copyright', label: 'Порушення авторських прав' },
    { value: 'other', label: 'Інше' },
  ]

  async function handleSubmit() {
    setStatus('loading')
    try {
      await markersApi.reportMarker(markerId, reason, comment || undefined)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] bg-white rounded-2xl shadow-xl p-6">
        {status === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="check" size={24} stroke="#10B981" />
            </div>
            <p className="text-slate-800 font-semibold mb-1">Скаргу надіслано</p>
            <p className="text-sm text-slate-500 mb-4">Дякуємо за допомогу у підтримці спільноти</p>
            <button onClick={onClose} className="btn-primary w-full">Закрити</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Поскаржитись</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Reason select */}
            <div className="space-y-2 mb-4">
              {reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'border-brand-300 bg-brand-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-brand-500"
                  />
                  <span className="text-sm text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>

            {/* Optional comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Додатковий коментар (необов'язково)"
              rows={2}
              maxLength={500}
              className="input w-full mb-4 resize-none text-sm"
            />

            {status === 'error' && (
              <p className="text-xs text-red-500 mb-3">Щось пішло не так. Спробуйте ще раз.</p>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary flex-1">Скасувати</button>
              <button
                onClick={handleSubmit}
                disabled={status === 'loading'}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {status === 'loading' ? 'Надсилання...' : 'Надіслати'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// CommentsSection
// ---------------------------------------------------------------------------

interface CommentsSectionProps {
  markerId: string
  allowComments: boolean
  initialCount: number
  onCountChange: (count: number) => void
}

function CommentsSection({ markerId, allowComments, initialCount, onCountChange }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(initialCount)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [text, setText] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<UserProfile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    onCountChange(commentCount)
  }, [commentCount, onCountChange])

  // Initial load on markerId change
  useEffect(() => {
    setComments([])
    setCursor(undefined)
    setHasMore(false)
    setIsLoading(true)
    markersApi
      .getComments(markerId, undefined, 20)
      .then((resp) => {
        setComments(resp.data.comments ?? [])
        setCursor(resp.data.cursor)
        setHasMore(resp.data.has_more ?? false)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [markerId])

  // WebSocket: receive new comments in real-time (dedup by id to avoid double-add on own submit)
  useEffect(() => {
    const handler = (data: unknown) => {
      const msg = data as { marker_id: string; comment: Comment }
      if (msg.marker_id === markerId) {
        setComments((prev) => {
          if (prev.some((c) => c.id === msg.comment.id)) return prev
          return [msg.comment, ...prev]
        })
        setCommentCount((prev) => prev + 1)
      }
    }
    wsClient.on('new_comment', handler)
    return () => wsClient.off('new_comment', handler)
  }, [markerId])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    setIsLoading(true)
    try {
      const resp = await markersApi.getComments(markerId, cursor, 20)
      setComments((prev) => [...prev, ...(resp.data.comments ?? [])])
      setCursor(resp.data.cursor)
      setHasMore(resp.data.has_more ?? false)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [markerId, cursor, hasMore, isLoading])

  function detectMention(value: string): string | null {
    const match = value.match(/@(\w*)$/)
    return match ? match[1] : null
  }

  const handleTextChange = useCallback(async (value: string) => {
    setText(value)
    const query = detectMention(value)
    setMentionQuery(query)
    if (query !== null) {
      try {
        const resp = await apiClient.get<{ users: UserProfile[] }>('/search', {
          params: { type: 'users', q: query, limit: 5 },
        })
        setSuggestions(resp.data.users ?? [])
      } catch {
        setSuggestions([])
      }
    } else {
      setSuggestions([])
    }
  }, [])

  function applyMention(user: UserProfile) {
    const newText = text.replace(/@(\w*)$/, `@${user.display_name} `)
    setText(newText)
    setMentionQuery(null)
    setSuggestions([])
    textareaRef.current?.focus()
  }

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || isSubmitting) return
    setIsSubmitting(true)
    try {
      const resp = await markersApi.createComment(markerId, trimmed)
      setComments((prev) => [resp.data, ...prev])
      setCommentCount((prev) => prev + 1)
      setText('')
      setSuggestions([])
      setMentionQuery(null)
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && suggestions.length === 0) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
        Коментарі ({commentCount})
      </h3>

      {/* Comment list */}
      {isLoading && comments.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-3">Завантаження...</p>
      )}
      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-3">Поки немає коментарів</p>
      )}

      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {comment.author_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-xs font-semibold text-slate-800">{comment.author_name}</span>
              <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-relaxed break-words">{comment.content}</p>
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => void loadMore()}
          disabled={isLoading}
          className="w-full text-xs text-brand-600 hover:text-brand-700 py-2 font-medium disabled:opacity-50"
        >
          {isLoading ? 'Завантаження...' : 'Показати ще коментарі'}
        </button>
      )}

      {/* Input / disabled message */}
      {allowComments ? (
        <div className="mt-3 relative">
          {/* @mention suggestions dropdown */}
          {mentionQuery !== null && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    applyMention(user)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {user.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm text-slate-800 truncate">{user.display_name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => void handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написати коментар... (@mention)"
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder-slate-400 resize-none outline-none leading-relaxed min-h-[20px] max-h-[80px] overflow-y-auto"
            />
            <button
              onClick={() => void handleSubmit()}
              disabled={!text.trim() || isSubmitting}
              className="p-2 rounded-full bg-brand-500 text-white disabled:opacity-40 hover:bg-brand-600 transition-colors flex-shrink-0"
              aria-label="Надіслати"
            >
              <Icon name="send" size={14} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">Коментарі вимкнені</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MarkerDetailDrawer
// ---------------------------------------------------------------------------

export interface MarkerDetailDrawerProps {
  marker: MarkerData | null
  isOwner?: boolean
  onClose: () => void
}

export default function MarkerDetailDrawer({ marker, isOwner = false, onClose }: MarkerDetailDrawerProps) {
  const { label: ttlLabel, expired: ttlExpired, critical: ttlCritical } = useTtlCountdown(
    marker?.expiration_type ?? 'ETERNAL',
    marker?.expires_at ?? null,
  )

  const [localWeight, setLocalWeight] = useState<number>(marker?.like_weight ?? 0)
  const [userVote, setUserVote] = useState<LikeType | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [localCommentCount, setLocalCommentCount] = useState<number>(marker?.comment_count ?? 0)

  // Reset local optimistic state when a different marker is opened.
  // Intentionally omit like_weight/comment_count — adding them would overwrite
  // optimistic updates on every server push.
  useEffect(() => {
    setLocalWeight(marker?.like_weight ?? 0)
    setUserVote(null)
    setLocalCommentCount(marker?.comment_count ?? 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker?.id])

  // Re-subscribe WS handler when marker changes. marker?.id is the only
  // meaningful dependency — marker object reference may differ between renders.
  useEffect(() => {
    if (!marker) return
    const handler = (data: unknown) => {
      const msg = data as { marker_id: string; like_weight: number }
      if (msg.marker_id === marker.id) {
        setLocalWeight(msg.like_weight)
      }
    }
    wsClient.on('like_update', handler)
    return () => wsClient.off('like_update', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker?.id])

  async function handleVote(type: LikeType) {
    if (!marker) return
    const prevWeight = localWeight
    const prevVote = userVote

    if (userVote === type) {
      setUserVote(null)
      setLocalWeight((w) => w + (type === 'LIKE' ? -1 : 1))
    } else {
      const delta = type === 'LIKE' ? 1 : -1
      const cancelPrev = prevVote !== null ? (prevVote === 'LIKE' ? -1 : 1) : 0
      setLocalWeight((w) => w + delta + cancelPrev)
      setUserVote(type)
    }

    try {
      await markersApi.toggleLike(marker.id, type)
    } catch {
      setLocalWeight(prevWeight)
      setUserVote(prevVote)
    }
  }

  if (!marker) return null

  const photos = marker.images ?? []
  const tags = marker.tags ?? []

  return (
    <>
      {/* Backdrop (mobile / click-outside to close) */}
      <div
        className="fixed inset-0 z-[124] bg-black/30 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
      />

      {/*
       * Desktop: fixed right drawer, 420px wide
       * Mobile: bottom sheet (bottom-0, left-0, right-0, rounded-t-2xl)
       */}
      <div
        className={[
          'fixed z-[125] bg-white overflow-y-auto',
          'shadow-lg',
          // Desktop
          'md:top-0 md:right-0 md:bottom-0 md:w-[420px] md:rounded-none',
          'md:animate-[slideRight_280ms_cubic-bezier(0.2,0,0,1)]',
          // Mobile: bottom sheet
          'max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[90vh] max-md:rounded-t-2xl',
          'max-md:animate-[slideUp_280ms_cubic-bezier(0.2,0,0,1)]',
        ].join(' ')}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Photo gallery */}
        <div className="relative">
          <PhotoGallery photos={photos} />

          {/* Close button — overlaid on gallery */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-slate-900 hover:bg-white transition-colors z-10"
            aria-label="Закрити"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="px-5 py-4 pb-8">
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-[20px] font-bold text-slate-900 leading-tight tracking-tight flex-1">
              {marker.title}
            </h2>
            {marker.is_draft && (
              <span className="flex-shrink-0 text-xs bg-slate-100 text-slate-500 rounded-md px-2 py-0.5 font-medium">
                Чернетка
              </span>
            )}
          </div>

          {/* Description */}
          {marker.description && (
            <p className="text-[14px] text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">
              {marker.description}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-4 py-3 border-y border-slate-100 mb-3.5">
            {/* comment_count */}
            <div>
              <div className="font-mono text-base font-bold text-slate-900">
                {localCommentCount}
              </div>
              <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
                коментарів
              </div>
            </div>

            {/* view_count — only visible to owner */}
            {isOwner && (
              <div className="flex items-center gap-1.5">
                <div>
                  <div className="font-mono text-base font-bold text-slate-900 flex items-center gap-1">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-500"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {(marker as MarkerData & { view_count?: number }).view_count ?? 0}
                  </div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
                    переглядів
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LikeBar */}
          <div className="flex items-center gap-3 py-3 border-b border-slate-100 mb-3.5">
            <button
              onClick={() => handleVote('LIKE')}
              disabled={!marker.allow_likes}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                userVote === 'LIKE'
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="Подобається"
            >
              <Icon name="heart" size={14} stroke="currentColor" />
              <span>Подобається</span>
            </button>

            <button
              onClick={() => handleVote('DISLIKE')}
              disabled={!marker.allow_likes}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                userVote === 'DISLIKE'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="Не подобається"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
              <span>Не подобається</span>
            </button>

            <span
              className="ml-auto font-mono font-bold text-base"
              style={{ color: heatColor(localWeight) }}
            >
              {localWeight >= 0 ? '+' : ''}{localWeight}
            </span>
          </div>

          {/* TTL badge */}
          {ttlLabel && (
            <div className="mb-3.5">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                  ttlExpired
                    ? 'bg-gray-100 text-gray-400'
                    : ttlCritical
                    ? 'bg-red-50 text-red-600 animate-pulse'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                <Icon name="clock" size={12} stroke={ttlCritical ? '#DC2626' : ttlExpired ? '#9CA3AF' : '#92400E'} />
                {ttlLabel}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-col gap-1 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Icon name="clock" size={12} />
              <span>{timeAgo(marker.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="map-pin" size={12} />
              <span>
                {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
              </span>
            </div>
          </div>

          {/* Report button — only for non-owners */}
          {!isOwner && (
            <button
              onClick={() => setReportOpen(true)}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <Icon name="alert-circle" size={12} />
              <span>Поскаржитись</span>
            </button>
          )}

          {/* Comments section */}
          <CommentsSection
            markerId={marker.id}
            allowComments={marker.allow_comments}
            initialCount={marker.comment_count}
            onCountChange={setLocalCommentCount}
          />
        </div>
      </div>

      {/* ReportModal */}
      {reportOpen && (
        <ReportModal markerId={marker.id} onClose={() => setReportOpen(false)} />
      )}
    </>
  )
}
