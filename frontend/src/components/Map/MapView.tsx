/* eslint-disable react-refresh/only-export-components */
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, useMap } from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { useGeolocation } from '@/hooks/useGeolocation'
import MarkerPin from '@/components/ui/MarkerPin'
import Icon from '@/components/ui/Icon'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

export type MapTheme = 'light' | 'dark' | 'satellite'

const TILE_URLS: Record<MapTheme, string> = {
  light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

const DEFAULT_CENTER: [number, number] = [48.45, 34.98]
const DEFAULT_ZOOM = 13

export function createHeatIcon(weight: number): L.DivIcon {
  const svg = renderToStaticMarkup(<MarkerPin weight={weight} size={32} />)
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

export interface MapMarkerData {
  id: string
  lat: number
  lon: number
  title: string
  like_weight: number
}

interface MapViewProps {
  theme?: MapTheme
  markers?: MapMarkerData[]
  onMarkerClick?: (id: string) => void
  locateTrigger?: number
  mapRef?: React.MutableRefObject<L.Map | null>
}

function LocateControl({ trigger }: { trigger?: number }) {
  const map = useMap()
  const { position } = useGeolocation()
  const lastTrigger = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (trigger !== lastTrigger.current && position) {
      map.flyTo(position, 15, { duration: 1 })
      lastTrigger.current = trigger
    }
  }, [trigger, position, map])

  return null
}

function MapRefCapture({ mapRef }: { mapRef?: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => {
    if (mapRef) mapRef.current = map
  }, [map, mapRef])
  return null
}

export default function MapView({ theme = 'light', markers = [], onMarkerClick, locateTrigger, mapRef }: MapViewProps) {
  const { position } = useGeolocation()

  return (
    <MapContainer
      center={position ?? DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer key={theme} url={TILE_URLS[theme]} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <LocateControl trigger={locateTrigger} />
      <MapRefCapture mapRef={mapRef} />

      {position && (
        <CircleMarker
          center={position}
          radius={9}
          pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.85, weight: 2 }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]}>
            <span className="text-xs font-medium">Ви тут</span>
          </Tooltip>
        </CircleMarker>
      )}

      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lon]}
          icon={createHeatIcon(m.like_weight)}
          eventHandlers={{ click: () => onMarkerClick?.(m.id) }}
        >
          <Tooltip direction="top" offset={[0, -38]}>{m.title}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}

export function ZoomControls({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
      <button
        onClick={() => mapRef.current?.zoomIn()}
        className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
      >
        <Icon name="plus" size={18} />
      </button>
      <button
        onClick={() => mapRef.current?.zoomOut()}
        className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="text-xl font-light leading-none">−</span>
      </button>
    </div>
  )
}
