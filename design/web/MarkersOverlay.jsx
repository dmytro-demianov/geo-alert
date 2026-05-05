// MarkersOverlay.jsx — pins + radius circles + user dot, positioned over the map
function RadiusCircleW({ x, y, r = 70, hot }) {
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
function UserDotW({ x, y }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 22, height: 22, marginLeft: -11, marginTop: -11, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(37,99,235,0.25)', borderRadius: '50%', animation: 'gd-pulse 1800ms cubic-bezier(0.2,0,0,1) infinite' }}/>
      <div style={{ position: 'absolute', inset: 6, background: '#2563EB', borderRadius: '50%', boxShadow: '0 0 0 3px #fff, 0 4px 8px rgba(37,99,235,0.4)' }}/>
    </div>
  );
}
function MarkersOverlay({ markers, selectedId, onSelect, userPos }) {
  return (
    <>
      {markers.map(m => (
        <RadiusCircleW key={'r'+m.id} x={m.x} y={m.y} r={m.radius || 70} hot={m.id === selectedId}/>
      ))}
      {markers.map(m => (
        <div key={m.id} style={{ position: 'absolute', left: m.x, top: m.y, marginLeft: -20, marginTop: -50, zIndex: 60 }}>
          <MarkerPin weight={m.like_weight} size={40} selected={m.id === selectedId} onClick={()=>onSelect(m.id)}/>
        </div>
      ))}
      {userPos && <UserDotW x={userPos.x} y={userPos.y}/>}
    </>
  );
}
window.MarkersOverlay = MarkersOverlay;
