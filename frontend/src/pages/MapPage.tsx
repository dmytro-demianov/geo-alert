import { useState, useCallback, useRef, useEffect } from 'react'
import L from 'leaflet'
import MapView, { MapTheme } from '@/components/Map/MapView'
import TopBar from '@/components/TopBar'
import LeftDrawer from '@/components/LeftDrawer'
import MarkerDetailDrawer from '@/components/MarkerDetailDrawer'
import MapControls from '@/components/MapControls'
import HeatLegend from '@/components/HeatLegend'
import FAB from '@/components/FAB'
import CreateCardModal from '@/components/CreateCardModal'
import { cardsApi, type Card } from '@/api/cards'
import { markersApi, type MarkerData } from '@/api/markers'
import { useAuthStore } from '@/store/auth'

export default function MapPage() {
  const mapRef = useRef<L.Map | null>(null)
  const user = useAuthStore((s) => s.user)

  const [createCardOpen, setCreateCardOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mapTheme, setMapTheme] = useState<MapTheme>('light')
  const [locateTrigger, setLocateTrigger] = useState(0)

  const [cards, setCards] = useState<Card[]>([])
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null)

  // Stable ref to avoid stale closures in map event handlers
  const markersRef = useRef<MarkerData[]>([])
  markersRef.current = markers

  const handleLocate = useCallback(() => setLocateTrigger((n) => n + 1), [])

  // Load public cards on mount
  useEffect(() => {
    cardsApi.listPublic(50).then((res) => setCards(res.data.cards ?? [])).catch(() => {})
  }, [])

  // Load markers for a card when selected from LeftDrawer
  const handleCardOpen = useCallback((cardId: string) => {
    markersApi.list(cardId, 100)
      .then((res) => {
        const list = (res.data.markers ?? []).filter(
          (m) => !m.is_draft && (m.expiration_type === 'ETERNAL' || !m.expires_at || new Date(m.expires_at).getTime() > Date.now())
        )
        setMarkers(list)
        setSelectedMarker(null)
      })
      .catch(() => {})
  }, [])

  // Marker pin click on the map
  const handleMarkerClick = useCallback((id: string) => {
    const marker = markersRef.current.find((m) => m.id === id)
    setSelectedMarker(marker ?? null)
  }, [])

  // Refetch cards after creating a new one
  const handleCardCreated = useCallback((_card: Card) => {
    setCreateCardOpen(false)
    cardsApi.listPublic(50).then((res) => setCards(res.data.cards ?? [])).catch(() => {})
  }, [])

  const isOwner = selectedMarker !== null && !!user?.id && selectedMarker.created_by === user.id

  return (
    <div className="relative h-screen w-screen">
      {/* isolate — Leaflet z-indices содержатся внутри, не вылезают наружу */}
      <div className="absolute inset-0 isolate">
        <MapView
          theme={mapTheme}
          markers={markers.map((m) => ({
            id: m.id,
            lat: m.latitude,
            lon: m.longitude,
            title: m.title,
            like_weight: m.like_weight,
          }))}
          onMarkerClick={handleMarkerClick}
          locateTrigger={locateTrigger}
          mapRef={mapRef}
        />
      </div>

      <TopBar
        onMenuToggle={() => setDrawerOpen((v) => !v)}
        onCreateCard={() => setCreateCardOpen(true)}
      />

      <LeftDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        markers={markers.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          like_weight: m.like_weight,
          comment_count: m.comment_count,
          created_at: m.created_at,
          created_by: m.created_by,
        }))}
        cards={cards.map((c) => ({
          id: c.id,
          title: c.title,
          marker_count: 0,
          subscriber_count: 0,
          privacy: c.is_public ? 'public' : 'private',
        }))}
        currentUserId={user?.id}
        onOpenMarker={(m) => {
          const marker = markersRef.current.find((x) => x.id === m.id)
          setSelectedMarker(marker ?? null)
        }}
        onOpenCard={(c) => handleCardOpen(c.id)}
        onCreateCard={() => setCreateCardOpen(true)}
      />

      <MarkerDetailDrawer
        marker={selectedMarker}
        isOwner={isOwner}
        onClose={() => setSelectedMarker(null)}
      />

      <MapControls onLocate={handleLocate} onThemeChange={setMapTheme} mapRef={mapRef} />
      <HeatLegend />
      <FAB onClick={() => setCreateCardOpen(true)} />

      {createCardOpen && (
        <CreateCardModal
          onClose={() => setCreateCardOpen(false)}
          onCreated={handleCardCreated}
        />
      )}
    </div>
  )
}
