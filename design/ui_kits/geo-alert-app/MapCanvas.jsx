// MapCanvas.jsx — fake Leaflet view: tile-pattern background, radius circles,
// marker pins, user dot. Click a marker to invoke onSelect.

const TILE_BG = `
  linear-gradient(0deg, rgba(15,23,42,0.04) 1px, transparent 1px),
  linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px),
  radial-gradient(circle at 20% 30%, rgba(16,185,129,0.10), transparent 40%),
  radial-gradient(circle at 80% 70%, rgba(59,130,246,0.10), transparent 35%),
  radial-gradient(circle at 60% 40%, rgba(245,158,11,0.06), transparent 35%)
`;

// Fake "streets" rendered as gentle SVG lines for atmosphere
function StreetLayer() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="none"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <g stroke="#cbd5e1" strokeWidth="2" fill="none" opacity="0.7">
        <path d="M -10 120 Q 200 100, 400 150 T 810 130"/>
        <path d="M -10 320 Q 250 280, 500 340 T 810 320"/>
        <path d="M 100 -10 Q 120 200, 80 400 T 110 610"/>
        <path d="M 480 -10 Q 510 200, 460 400 T 490 610"/>
        <path d="M 700 -10 Q 720 200, 680 400 T 710 610"/>
      </g>
      <g stroke="#94a3b8" strokeWidth="3" fill="none" opacity="0.55">
        <path d="M -10 240 Q 350 200, 810 260"/>
        <path d="M 290 -10 Q 320 300, 280 610"/>
      </g>
      <g fill="#dcfce7" opacity="0.7">
        <ellipse cx="180" cy="450" rx="80" ry="50"/>
        <ellipse cx="640" cy="180" rx="60" ry="40"/>
      </g>
      <g fill="#bae6fd" opacity="0.7">
        <path d="M 0 500 Q 200 480, 400 520 T 800 510 L 800 600 L 0 600 Z"/>
      </g>
    </svg>
  );
}

function RadiusCircle({ x, y, r = 60, hot }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: r*2, height: r*2, marginLeft: -r, marginTop: -r,
      borderRadius: '50%',
      background: hot ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)',
      border: `1.5px solid ${hot ? 'rgba(239,68,68,0.55)' : 'rgba(239,68,68,0.30)'}`,
      animation: hot ? 'gd-pulse 1800ms cubic-bezier(0.2,0,0,1) infinite' : 'none',
      pointerEvents: 'none',
    }}/>
  );
}

function UserDot({ x, y }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 22, height: 22, marginLeft: -11, marginTop: -11,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(37,99,235,0.25)', borderRadius: '50%',
        animation: 'gd-pulse 1800ms cubic-bezier(0.2,0,0,1) infinite',
      }}/>
      <div style={{
        position: 'absolute', inset: 6,
        background: '#2563EB', borderRadius: '50%',
        boxShadow: '0 0 0 3px #fff, 0 4px 8px rgba(37,99,235,0.4)',
      }}/>
    </div>
  );
}

function MapCanvas({ markers = [], userPos, selectedId, onSelect }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#EEF2F6',
      backgroundImage: TILE_BG,
      backgroundSize: '40px 40px, 40px 40px, auto, auto, auto',
      overflow: 'hidden',
    }}>
      <StreetLayer/>
      {markers.map(m => (
        <RadiusCircle key={'r'+m.id} x={m.x} y={m.y} r={m.radius || 60} hot={m.id === selectedId}/>
      ))}
      {markers.map(m => (
        <div key={m.id} style={{
          position: 'absolute', left: m.x, top: m.y,
          marginLeft: -18, marginTop: -45,
        }}>
          <MarkerPin weight={m.like_weight} size={36}
                     selected={m.id === selectedId}
                     onClick={() => onSelect && onSelect(m.id)}/>
        </div>
      ))}
      {userPos && <UserDot x={userPos.x} y={userPos.y}/>}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: '#64748B', background: 'rgba(255,255,255,0.7)',
        padding: '2px 6px', borderRadius: 4,
      }}>
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

window.MapCanvas = MapCanvas;
