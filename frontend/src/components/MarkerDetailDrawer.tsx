import { useState, useEffect } from 'react'
import Icon from './ui/Icon'
import { heatColor } from './ui/MarkerPin'
import { type MarkerData, type ExpirationType } from '@/api/markers'

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

  if (!marker) return null

  const photos = marker.images ?? []
  const tags = marker.tags ?? []
  const weight = marker.like_weight

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
            {/* like_weight */}
            <div>
              <div
                className="font-mono text-base font-bold"
                style={{ color: heatColor(weight) }}
              >
                {weight >= 0 ? '+' : ''}{weight}
              </div>
              <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
                like_weight
              </div>
            </div>

            {/* comment_count */}
            <div>
              <div className="font-mono text-base font-bold text-slate-900">
                {marker.comment_count}
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
                    {/* view_count field name differs from API spec; fall back gracefully */}
                    {(marker as MarkerData & { view_count?: number }).view_count ?? 0}
                  </div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
                    переглядів
                  </div>
                </div>
              </div>
            )}
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
        </div>
      </div>
    </>
  )
}
