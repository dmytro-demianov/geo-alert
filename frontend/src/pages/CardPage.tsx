import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { cardsApi, type Card } from '@/api/cards'
import { markersApi, type MarkerData, type ExpirationType } from '@/api/markers'
import { useAuthStore } from '@/store/auth'
import CreateMarkerModal from '@/components/CreateMarkerModal'
import MarkerDetailDrawer from '@/components/MarkerDetailDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingLocation {
  latitude: number
  longitude: number
}

// ---------------------------------------------------------------------------
// TTL Countdown hook
// ---------------------------------------------------------------------------

function formatTtl(ms: number): string {
  if (ms <= 0) return 'Истекла'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  if (days > 0) {
    return `${days}д ${hours}ч`
  }
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
// Marker TTL badge
// ---------------------------------------------------------------------------

interface TtlBadgeProps {
  expirationType: ExpirationType
  expiresAt: string | null
}

function TtlBadge({ expirationType, expiresAt }: TtlBadgeProps) {
  const { label, expired, critical } = useTtlCountdown(expirationType, expiresAt)

  if (!label) return null

  return (
    <span
      className={`inline-block text-xs font-mono mt-1 px-1.5 py-0.5 rounded ${
        expired
          ? 'bg-gray-100 text-gray-400'
          : critical
          ? 'bg-red-50 text-red-600 animate-pulse'
          : 'bg-yellow-50 text-yellow-700'
      }`}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Map click handler component
// ---------------------------------------------------------------------------

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ---------------------------------------------------------------------------
// Main CardPage component
// ---------------------------------------------------------------------------

export default function CardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [card, setCard] = useState<Card | null>(null)
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MarkerData | null>(null)
  const [drawerMarker, setDrawerMarker] = useState<MarkerData | null>(null)
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null)
  const isOwner = card !== null && user !== null && card.owner_id === user.id
  // Keep a stable ref to avoid re-renders in MapClickHandler
  const isOwnerRef = useRef(isOwner)
  isOwnerRef.current = isOwner

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      cardsApi.getById(id),
      markersApi.list(id),
    ])
      .then(([cardRes, markersRes]) => {
        setCard(cardRes.data)
        setMarkers(markersRes.data.markers ?? [])
      })
      .catch(() => setError('Не удалось загрузить карту'))
      .finally(() => setLoading(false))
  }, [id])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!isOwnerRef.current) return
    setPendingLocation({ latitude: lat, longitude: lng })
  }, [])

  const handleMarkerCreated = (newMarker: MarkerData) => {
    setMarkers((prev) => [newMarker, ...prev])
    setSelected(newMarker)
    setPendingLocation(null)
  }

  // Filter out expired markers from the list
  const visibleMarkers = markers.filter((m) => {
    if (m.expiration_type === 'ETERNAL' || !m.expires_at) return true
    return new Date(m.expires_at).getTime() > Date.now()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-600">{error ?? 'Карта не найдена'}</p>
        <button onClick={() => navigate('/my-cards')} className="text-blue-600 hover:underline text-sm">
          ← Мои карты
        </button>
      </div>
    )
  }

  const center: [number, number] =
    markers.length > 0
      ? [markers[0].latitude, markers[0].longitude]
      : [48.45, 34.98]

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => navigate('/my-cards')}
              className="text-sm text-blue-600 hover:underline mb-2 block"
            >
              ← Мои карты
            </button>
            <h1 className="font-bold text-gray-900 text-lg">{card.title}</h1>
            {card.description && (
              <p className="text-sm text-gray-500 mt-1">{card.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  card.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {card.is_public ? 'Публичная' : 'Приватная'}
              </span>
              {isOwner && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  Мои карты
                </span>
              )}
            </div>
            {isOwner && (
              <p className="text-xs text-gray-400 mt-2">
                Нажмите на карту, чтобы добавить метку
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {visibleMarkers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Нет меток</p>
            ) : (
              visibleMarkers.map((m) => (
                <MarkerCard
                  key={m.id}
                  marker={m}
                  isSelected={selected?.id === m.id}
                  onClick={() => {
                    setSelected(m)
                    setDrawerMarker(m)
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {markers.map((m) => (
              <Marker
                key={m.id}
                position={[m.latitude, m.longitude]}
                eventHandlers={{
                  click: () => {
                    setSelected(m)
                    setDrawerMarker(m)
                  },
                }}
              >
                <Popup>
                  <strong>{m.title}</strong>
                  {m.description && <p className="text-xs mt-1">{m.description}</p>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Create marker modal */}
      {pendingLocation && id && (
        <CreateMarkerModal
          cardId={id}
          latitude={pendingLocation.latitude}
          longitude={pendingLocation.longitude}
          onClose={() => setPendingLocation(null)}
          onCreated={handleMarkerCreated}
        />
      )}

      {/* Marker detail drawer */}
      <MarkerDetailDrawer
        marker={drawerMarker}
        isOwner={isOwner}
        onClose={() => setDrawerMarker(null)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// MarkerCard sub-component
// ---------------------------------------------------------------------------

interface MarkerCardProps {
  marker: MarkerData
  isSelected: boolean
  onClick: () => void
}

function MarkerCard({ marker: m, isSelected, onClick }: MarkerCardProps) {
  const expired =
    m.expiration_type !== 'ETERNAL' && m.expires_at
      ? new Date(m.expires_at).getTime() <= Date.now()
      : false

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : expired
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-medium text-sm text-gray-900 truncate">{m.title}</p>
        {m.is_draft && (
          <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
            Черновик
          </span>
        )}
      </div>
      {m.description && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>
      )}
      {m.tags && m.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {m.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
        <span>👍 {m.like_weight}</span>
        <span>💬 {m.comment_count}</span>
        <TtlBadge expirationType={m.expiration_type} expiresAt={m.expires_at} />
      </div>
    </div>
  )
}
