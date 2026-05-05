import { useState, useCallback } from 'react'
import MapView, { MapTheme } from '@/components/Map/MapView'
import TopBar from '@/components/TopBar'
import LeftDrawer from '@/components/LeftDrawer'
import RightDrawer from '@/components/RightDrawer'
import MapControls from '@/components/MapControls'
import HeatLegend from '@/components/HeatLegend'
import FAB from '@/components/FAB'

export default function MapPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [mapTheme, setMapTheme] = useState<MapTheme>('light')
  const [locateTrigger, setLocateTrigger] = useState(0)

  const handleLocate = useCallback(() => setLocateTrigger((n) => n + 1), [])

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedMarkerId(id)
  }, [])

  const handleCloseRight = useCallback(() => setSelectedMarkerId(null), [])

  const selectedMarker = selectedMarkerId
    ? {
        id: selectedMarkerId,
        title: 'Золоті ворота',
        description: 'Пам\'ятник архітектури XI ст. Одна з небагатьох споруд часів Київської Русі.',
        lat: 50.4501,
        lon: 30.5234,
        like_weight: 8,
        comment_count: 3,
        view_count: 142,
        tags: ['архітектура', 'історія', 'туризм'],
        photos: [],
        author: { name: 'Дмитро Д.', hue: 0 },
        ttl_label: '14 д 3 г',
      }
    : null

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapView
        theme={mapTheme}
        markers={[]}
        onMarkerClick={handleMarkerClick}
        locateTrigger={locateTrigger}
      />

      <TopBar
        onMenuToggle={() => setDrawerOpen((v) => !v)}
        onCreateCard={() => {}}
      />

      <LeftDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        markers={[]}
        cards={[]}
        onOpenMarker={(m) => setSelectedMarkerId(m.id)}
        onCreateCard={() => {}}
      />

      {selectedMarker && (
        <RightDrawer
          marker={selectedMarker}
          onClose={handleCloseRight}
          onShare={() => {}}
          onDelete={() => {}}
        />
      )}

      <MapControls onLocate={handleLocate} onThemeChange={setMapTheme} />
      <HeatLegend />
      <FAB onClick={() => {}} />
    </div>
  )
}
