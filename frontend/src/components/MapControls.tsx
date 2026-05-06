import { useState } from 'react'
import L from 'leaflet'
import Icon from './ui/Icon'
import { ZoomControls } from './Map/MapView'

interface MapControlsProps {
  onLocate: () => void
  onThemeChange?: (theme: MapTheme) => void
  mapRef: React.MutableRefObject<L.Map | null>
}

type MapTheme = 'light' | 'dark' | 'satellite'

const themes: Array<{ key: MapTheme; label: string; color: string; url: string }> = [
  { key: 'light',     label: 'Світла',   color: '#EEF2F6', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { key: 'dark',      label: 'Темна',    color: '#0F172A', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { key: 'satellite', label: 'Супутник', color: '#3F4A3A', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
]

export default function MapControls({ onLocate, onThemeChange, mapRef }: MapControlsProps) {
  const [theme, setTheme] = useState<MapTheme>('light')
  const [layerOpen, setLayerOpen] = useState(false)

  return (
    <div className="absolute right-5 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-2">
      <ZoomControls mapRef={mapRef} />

      <button
        onClick={onLocate}
        className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
        title="Моя позиція"
      >
        <Icon name="crosshair" size={20} />
      </button>

      <div className="relative">
        <button
          onClick={() => setLayerOpen((v) => !v)}
          className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
          title="Шари карти"
        >
          <Icon name="layers" size={20} />
        </button>
        {layerOpen && (
          <div className="absolute right-full top-0 mr-2 w-48 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden z-50">
            <div className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-slate-400 border-b border-slate-100">
              Шари мапи
            </div>
            {themes.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTheme(t.key); onThemeChange?.(t.key); setLayerOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-900 hover:bg-slate-50 transition-colors ${theme === t.key ? 'bg-brand-50' : ''}`}
              >
                <span className="w-5 h-5 rounded-md border border-slate-200 flex-shrink-0" style={{ background: t.color }} />
                <span className="flex-1 text-left">{t.label}</span>
                {theme === t.key && <Icon name="check" size={14} stroke="#EF4444" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
