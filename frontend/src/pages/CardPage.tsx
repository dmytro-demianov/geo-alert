import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { cardsApi, type Card } from '@/api/cards'
import { apiClient } from '@/api/client'

interface MarkerData {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
  like_weight: number
  comment_count: number
  created_at: string
}

interface MarkersResponse {
  markers: MarkerData[]
}

export default function CardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [card, setCard] = useState<Card | null>(null)
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MarkerData | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      cardsApi.getById(id),
      apiClient.get<MarkersResponse>(`/cards/${id}/markers`),
    ])
      .then(([cardRes, markersRes]) => {
        setCard(cardRes.data)
        setMarkers(markersRes.data.markers ?? [])
      })
      .catch(() => setError('Не удалось загрузить карту'))
      .finally(() => setLoading(false))
  }, [id])

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
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {card.is_public ? 'Публичная' : 'Приватная'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {markers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Нет меток</p>
          ) : (
            markers.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selected?.id === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-medium text-sm text-gray-900 truncate">{m.title}</p>
                {m.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>👍 {m.like_weight}</span>
                  <span>💬 {m.comment_count}</span>
                </div>
              </div>
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
          {markers.map((m) => (
            <Marker key={m.id} position={[m.latitude, m.longitude]}>
              <Popup>
                <strong>{m.title}</strong>
                {m.description && <p className="text-xs mt-1">{m.description}</p>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
