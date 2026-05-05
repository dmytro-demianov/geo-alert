// Primitives.jsx — buttons, avatars, tags, marker pin

const HEAT = {
  cold:    '#9CA3AF',
  neutral: '#6B7280',
  warm:    '#FBBF24',
  hot:     '#F97316',
  fire:    '#EF4444',
};
function heatFor(weight) {
  if (weight < 0)  return HEAT.cold;
  if (weight <= 2) return HEAT.neutral;
  if (weight <= 5) return HEAT.warm;
  if (weight <= 10) return HEAT.hot;
  return HEAT.fire;
}

function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style, full }) {
  const base = {
    fontFamily: 'inherit',
    fontWeight: 600,
    border: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 10,
    transition: 'background 120ms cubic-bezier(0.2,0,0,1), transform 80ms',
    display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center',
    width: full ? '100%' : 'auto',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13, borderRadius: 9999 },
    md: { padding: '10px 18px', fontSize: 14 },
    lg: { padding: '14px 22px', fontSize: 16 },
  };
  const variants = {
    primary:   { background: '#EF4444', color: '#fff' },
    secondary: { background: '#fff', color: '#0F172A', border: '1px solid #CBD5E1' },
    ghost:     { background: 'transparent', color: '#0F172A' },
    dark:      { background: '#0F172A', color: '#fff' },
    soft:      { background: '#FEE2E2', color: '#B91C1C' },
    danger:    { background: '#fff', color: '#B91C1C', border: '1px solid #FECACA' },
  };
  const dis = disabled ? { background: '#F1F5F9', color: '#CBD5E1', border: 0 } : {};
  return (
    <button onClick={disabled ? undefined : onClick}
            style={{ ...base, ...sizes[size], ...variants[variant], ...dis, ...style }}>
      {children}
    </button>
  );
}

function Avatar({ name = '?', size = 36, hue = 0 }) {
  const initials = name.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
  const palettes = [
    'linear-gradient(135deg,#FCA5A5,#EF4444)',
    'linear-gradient(135deg,#FBBF24,#F97316)',
    'linear-gradient(135deg,#94A3B8,#475569)',
    'linear-gradient(135deg,#A7F3D0,#10B981)',
    'linear-gradient(135deg,#BAE6FD,#3B82F6)',
  ];
  const bg = palettes[Math.abs(hue) % palettes.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.38),
      flexShrink: 0,
    }}>{initials}</div>
  );
}

function Tag({ children, hot }) {
  return (
    <span style={{
      background: hot ? '#FEE2E2' : '#F1F5F9',
      color: hot ? '#B91C1C' : '#475569',
      padding: '4px 10px', borderRadius: 9999,
      fontSize: 12, fontWeight: hot ? 600 : 500,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function PrivacyBadge({ value }) {
  const map = {
    PUBLIC:    { bg: '#10B981', label: 'PUBLIC',    icon: 'globe' },
    LINK_ONLY: { bg: '#F59E0B', label: 'LINK ONLY', icon: 'link' },
    PRIVATE:   { bg: '#64748B', label: 'PRIVATE',   icon: 'lock' },
  };
  const m = map[value] || map.PUBLIC;
  return (
    <span style={{
      background: m.bg, color: '#fff', padding: '3px 9px',
      borderRadius: 9999, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', display: 'inline-flex',
      alignItems: 'center', gap: 4,
    }}>
      <Icon name={m.icon} size={11} sw={2.4}/>
      {m.label}
    </span>
  );
}

function MarkerPin({ weight = 0, size = 36, selected, onClick, style }) {
  const color = heatFor(weight);
  const w = size, h = size * 1.25;
  return (
    <div onClick={onClick} style={{
      cursor: onClick ? 'pointer' : 'default',
      transform: selected ? 'scale(1.15)' : 'scale(1)',
      transition: 'transform 180ms cubic-bezier(0.34,1.56,0.64,1)',
      filter: `drop-shadow(0 ${size*0.15}px ${size*0.4}px ${color}aa)`,
      ...style,
    }}>
      <svg viewBox="0 0 32 40" width={w} height={h} style={{ display: 'block' }}>
        <path d="M16 1C8.27 1 2 7.27 2 15c0 10.5 14 24 14 24s14-13.5 14-24C30 7.27 23.73 1 16 1z"
              fill={color} stroke="#fff" strokeWidth="2"/>
        <circle cx="16" cy="15" r="5" fill="#fff"/>
      </svg>
    </div>
  );
}

function Stat({ icon, value, color = '#475569', size = 13 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      color, fontSize: size, fontWeight: 500,
    }}>
      <Icon name={icon} size={size + 2} sw={2}/>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontFeatureSettings: '"tnum"' }}>{value}</span>
    </span>
  );
}

Object.assign(window, { Button, Avatar, Tag, PrivacyBadge, MarkerPin, Stat, heatFor, HEAT });
