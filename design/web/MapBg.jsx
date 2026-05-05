// MapBg.jsx — full-screen fake Leaflet map (light + dark + satellite themes)
const { useState: useStateMap, useRef: useRefMap, useEffect: useEffectMap } = React;

const MAP_THEMES = {
  light: {
    bg: '#EEF2F6',
    grid: 'rgba(15,23,42,0.04)',
    streets: '#cbd5e1',
    streetsBig: '#94a3b8',
    parks: '#dcfce7',
    water: '#bae6fd',
    blocks: 'rgba(15,23,42,0.025)',
    label: '#64748b',
    labelBg: 'rgba(255,255,255,0.85)',
    streetLabel: '#94a3b8',
  },
  dark: {
    bg: '#0F172A',
    grid: 'rgba(255,255,255,0.04)',
    streets: '#334155',
    streetsBig: '#475569',
    parks: 'rgba(34,197,94,0.18)',
    water: 'rgba(59,130,246,0.25)',
    blocks: 'rgba(255,255,255,0.02)',
    label: '#cbd5e1',
    labelBg: 'rgba(15,23,42,0.7)',
    streetLabel: '#475569',
  },
  satellite: {
    bg: '#3F4A3A',
    grid: 'rgba(0,0,0,0.08)',
    streets: '#d6c9a8',
    streetsBig: '#e8dcb6',
    parks: '#5a7544',
    water: '#4a6b8a',
    blocks: 'rgba(0,0,0,0.10)',
    label: '#fff',
    labelBg: 'rgba(0,0,0,0.55)',
    streetLabel: '#a89968',
  },
};

function FullMap({ theme = 'light', children }) {
  const t = MAP_THEMES[theme] || MAP_THEMES.light;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: t.bg,
      backgroundImage: `
        linear-gradient(0deg, ${t.grid} 1px, transparent 1px),
        linear-gradient(90deg, ${t.grid} 1px, transparent 1px)
      `,
      backgroundSize: '48px 48px',
      overflow: 'hidden',
    }}>
      {/* "city blocks" */}
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* parks */}
        <g fill={t.parks} opacity="0.85">
          <ellipse cx="280" cy="720" rx="170" ry="100"/>
          <ellipse cx="1180" cy="280" rx="120" ry="80"/>
          <path d="M 1300 700 Q 1380 680, 1450 720 T 1560 740 L 1560 820 Q 1430 800, 1300 820 Z"/>
        </g>
        {/* water */}
        <g fill={t.water} opacity="0.85">
          <path d="M 0 850 Q 350 820, 700 870 T 1600 850 L 1600 1010 L 0 1010 Z"/>
          <path d="M 1380 0 Q 1420 200, 1380 380 Q 1340 200, 1380 0 Z" opacity="0.7"/>
        </g>
        {/* block fills */}
        <g fill={t.blocks}>
          {Array.from({ length: 60 }).map((_, i) => {
            const x = (i * 173) % 1600;
            const y = ((i * 97) % 850);
            const w = 60 + (i * 17) % 80;
            const h = 40 + (i * 13) % 70;
            return <rect key={i} x={x} y={y} width={w} height={h} rx="4"/>;
          })}
        </g>
        {/* big streets */}
        <g stroke={t.streetsBig} strokeWidth="6" fill="none" opacity="0.7" strokeLinecap="round">
          <path d="M -20 480 Q 400 440, 800 500 T 1620 480"/>
          <path d="M 580 -20 Q 620 400, 560 800 T 600 1020"/>
        </g>
        {/* streets */}
        <g stroke={t.streets} strokeWidth="2.5" fill="none" opacity="0.8">
          <path d="M -20 220 Q 400 200, 800 240 T 1620 230"/>
          <path d="M -20 640 Q 500 600, 900 660 T 1620 650"/>
          <path d="M 200 -20 Q 220 400, 180 800 T 210 1020"/>
          <path d="M 960 -20 Q 990 400, 940 800 T 970 1020"/>
          <path d="M 1300 -20 Q 1330 400, 1280 800 T 1310 1020"/>
          {/* small streets */}
          <path d="M -20 350 Q 400 340, 800 360 T 1620 350" strokeWidth="1.5" opacity="0.6"/>
          <path d="M -20 780 Q 400 770, 800 790 T 1620 780" strokeWidth="1.5" opacity="0.6"/>
          <path d="M 400 -20 Q 420 400, 380 800 T 410 1020" strokeWidth="1.5" opacity="0.6"/>
          <path d="M 800 -20 Q 820 400, 780 800 T 810 1020" strokeWidth="1.5" opacity="0.6"/>
          <path d="M 1140 -20 Q 1160 400, 1120 800 T 1150 1020" strokeWidth="1.5" opacity="0.6"/>
        </g>
        {/* street labels */}
        <g fill={t.streetLabel} fontFamily="Inter, sans-serif" fontSize="11" fontWeight="500" opacity="0.7">
          <text x="120" y="476">вул. Хрещатик</text>
          <text x="1080" y="640">вул. Володимирська</text>
          <text x="600" y="220" transform="rotate(-2 600 220)">вул. Велика Васильківська</text>
        </g>
      </svg>
      {/* attribution */}
      <div style={{
        position: 'absolute', bottom: 6, right: 6, zIndex: 1,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: t.label, background: t.labelBg,
        padding: '3px 8px', borderRadius: 4,
      }}>
        © OpenStreetMap contributors
      </div>
      {children}
    </div>
  );
}

window.FullMap = FullMap;
window.MAP_THEMES = MAP_THEMES;
