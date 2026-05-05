// Screens.jsx — Login, Map (with sheet), MarkerDetail, CreateMarker, Feed

const { useState, useEffect, useRef } = React;

// ------------------------------------------------------------
// Mock data lifted from tasks/mock-api.yaml
// ------------------------------------------------------------
const ME = { id: 'me', name: "Дмитро Дем'янов", handle: '@dmytro' };

const CARD = {
  id: 'card-1', title: 'Интересные места Киева',
  description: 'Мои любимые места', privacy: 'PUBLIC',
  radius: 200, marker_count: 12, subscriber_count: 234,
};

const MARKERS = [
  { id: 'm1', title: 'Золоті ворота', description: "Пам'ятка архітектури XI ст. Гарне місце для прогулянок ранком.",
    lat: 50.4501, lon: 30.5234, like_weight: 7, comment_count: 3, view_count: 1247,
    tags: ['история','архитектура'], expires_at: '2026-06-01T00:00:00Z',
    x: 380, y: 230, hue: 0,
    photos: ['#FCA5A5','#FBBF24','#A7F3D0'],
    author: { name: 'Анна К.', hue: 0 } },
  { id: 'm2', title: 'Кав\'ярня "Один"', description: 'Найкраща кава в районі. Wi-Fi і затишок.',
    lat: 50.4510, lon: 30.5210, like_weight: 12, comment_count: 7, view_count: 892,
    tags: ['кафе','wi-fi'], x: 240, y: 320, hue: 1, photos: ['#FBBF24'],
    author: { name: 'Михайло', hue: 1 } },
  { id: 'm3', title: 'Скейт-парк', description: 'Маленький, але класний.',
    lat: 50.4490, lon: 30.5260, like_weight: 4, comment_count: 1, view_count: 312,
    tags: ['спорт'], x: 540, y: 380, hue: 2, photos: [],
    author: { name: 'Костя', hue: 2 } },
  { id: 'm4', title: 'Стара синагога', description: '',
    lat: 50.4520, lon: 30.5180, like_weight: 1, comment_count: 0, view_count: 88,
    tags: ['история'], x: 150, y: 180, hue: 3, photos: [],
    author: { name: 'Олена', hue: 3 } },
  { id: 'm5', title: 'Закинутий двір', description: '',
    lat: 50.4480, lon: 30.5300, like_weight: -2, comment_count: 0, view_count: 22,
    tags: [], x: 660, y: 460, hue: 4, photos: [],
    author: { name: 'Аноним', hue: 4 } },
];

const COMMENTS = [
  { id: 'c1', user: { name: 'Михайло', hue: 1 }, text: 'Відмінне місце!', created_at: '2 ч' },
  { id: 'c2', user: { name: 'Олена', hue: 3 }, text: 'Була в неділю — рекомендую ранком, до 10:00 ще спокійно.', created_at: '5 ч' },
  { id: 'c3', user: { name: 'Костя', hue: 2 }, text: 'А скільки коштує вхід?', created_at: '1 д' },
];

const SUBSCRIBED_CARDS = [
  { ...CARD },
  { id: 'card-2', title: 'Скейт-споты Подола', description: '', privacy: 'LINK_ONLY', radius: 100, marker_count: 8, subscriber_count: 31 },
  { id: 'card-3', title: 'Кафе с Wi-Fi', description: '', privacy: 'PUBLIC', radius: 50, marker_count: 24, subscriber_count: 412 },
];

// ------------------------------------------------------------
// LoginScreen
// ------------------------------------------------------------
function LoginScreen({ onLogin }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #FEE2E2 0%, #fff 50%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 24, textAlign: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
        background: 'radial-gradient(circle at 30% 20%, rgba(239,68,68,0.18), transparent 40%), radial-gradient(circle at 70% 70%, rgba(239,68,68,0.12), transparent 50%)',
      }}/>
      <img src="../../assets/logo-mark.svg" width="80" height="80" alt="" style={{ position: 'relative' }}/>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', lineHeight: 1.1 }}>
          Geo-Alert
        </div>
        <div style={{ fontSize: 16, color: '#475569', marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>
          Карти, які знають, коли ти поруч.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, position: 'relative' }}>
        <Button variant="dark" size="lg" full onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.5 2.4-2.55 3.8-5.35 3.8-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.45 0 2.75.55 3.75 1.4l2.4-2.4C16.55 3.95 14.4 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.6-3.65 8.6-8.8 0-.4-.05-.75-.1-1.1z"/></svg>
          Войти через Google
        </Button>
        <Button variant="ghost" size="md" full>Войти как гость</Button>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, fontSize: 11, color: '#94A3B8' }}>
        Соглашаясь, ты принимаешь условия и политику конфиденциальности
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// TopAppBar — frosted over map
// ------------------------------------------------------------
function TopAppBar({ onMenu, onSearch }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      padding: '12px 14px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(15,23,42,0.06)',
      display: 'flex', alignItems: 'center', gap: 10, zIndex: 30,
    }}>
      <button onClick={onMenu} style={iconBtnStyle}>
        <Icon name="menu" size={22}/>
      </button>
      <div onClick={onSearch} style={{
        flex: 1, background: '#F1F5F9', borderRadius: 9999,
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)',
        cursor: 'pointer',
      }}>
        <Icon name="search" size={16} stroke="#94A3B8"/>
        <span style={{ color: '#94A3B8', fontSize: 14 }}>Поиск меток…</span>
      </div>
      <button style={{ ...iconBtnStyle, position: 'relative' }}>
        <Icon name="bell" size={22}/>
        <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#EF4444', borderRadius: '50%', border: '1.5px solid #fff' }}/>
      </button>
    </div>
  );
}

const iconBtnStyle = {
  background: 'transparent', border: 0, padding: 8,
  borderRadius: 9999, cursor: 'pointer', color: '#0F172A',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ------------------------------------------------------------
// FAB
// ------------------------------------------------------------
function FAB({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', bottom: 24, right: 20, zIndex: 50,
      width: 56, height: 56, borderRadius: 9999,
      background: '#EF4444', color: '#fff',
      border: 0, cursor: 'pointer',
      boxShadow: '0 6px 16px rgba(239,68,68,0.45), 0 2px 4px rgba(239,68,68,0.30)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="plus" size={26} sw={2.4}/>
    </button>
  );
}

// ------------------------------------------------------------
// BottomSheet
// ------------------------------------------------------------
function BottomSheet({ snap = 'half', onSnap, children }) {
  const heights = { peek: 130, half: 360, full: 580 };
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: heights[snap], background: '#fff',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      boxShadow: '0 -12px 24px rgba(15,23,42,0.10), 0 -4px 8px rgba(15,23,42,0.06)',
      transition: 'height 280ms cubic-bezier(0.2,0,0,1)',
      display: 'flex', flexDirection: 'column',
      zIndex: 40, overflow: 'hidden',
    }}>
      <div onClick={() => onSnap && onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')}
           style={{ padding: '10px 0 6px', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ width: 40, height: 4, background: '#CBD5E1', borderRadius: 2, margin: '0 auto' }}/>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MarkerCard — list item in bottom sheet / feed
// ------------------------------------------------------------
function MarkerCard({ marker, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '12px 16px', display: 'flex', gap: 12,
      borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
      transition: 'background 120ms',
    }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
       onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
      <MarkerPin weight={marker.like_weight} size={28}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {marker.title}
          </div>
          <span style={{
            background: heatFor(marker.like_weight), color: '#fff',
            padding: '1px 7px', borderRadius: 9999,
            fontSize: 10, fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
          }}>{marker.like_weight >= 0 ? '+' : ''}{marker.like_weight}</span>
        </div>
        {marker.description && (
          <div style={{ fontSize: 13, color: '#475569', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {marker.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center', color: '#64748B' }}>
          <Stat icon="heart" value={marker.like_weight} size={11}/>
          <Stat icon="message" value={marker.comment_count} size={11}/>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94A3B8' }}>
            {Math.round(120 + marker.x * 0.5)} м
          </span>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MapScreen
// ------------------------------------------------------------
function MapScreen({ onOpenMarker, onOpenCreate, onOpenFeed }) {
  const [snap, setSnap] = useState('half');
  const [selectedId, setSelectedId] = useState(null);
  const userPos = { x: 320, y: 360 };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapCanvas markers={MARKERS} userPos={userPos}
                 selectedId={selectedId}
                 onSelect={(id) => { setSelectedId(id); onOpenMarker(MARKERS.find(m=>m.id===id)); }}/>
      <TopAppBar/>
      {/* recenter */}
      <button style={{
        position: 'absolute', right: 20, bottom: snap === 'peek' ? 220 : snap === 'half' ? 450 : 670,
        width: 44, height: 44, borderRadius: 9999, background: '#fff',
        border: '1px solid #E2E8F0', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'bottom 280ms cubic-bezier(0.2,0,0,1)', zIndex: 35,
      }}>
        <Icon name="crosshair" size={20} stroke="#475569"/>
      </button>
      <FAB onClick={onOpenCreate}/>
      <BottomSheet snap={snap} onSnap={setSnap}>
        <div style={{ padding: '6px 16px 12px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {CARD.title}
                </div>
                <PrivacyBadge value={CARD.privacy}/>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>{CARD.marker_count} меток</span><span>•</span>
                <span>{CARD.subscriber_count} подписчиков</span><span>•</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>радиус {CARD.radius} м</span>
              </div>
            </div>
            <Button variant="soft" size="sm">+ Подписаться</Button>
          </div>
        </div>
        <div>
          {MARKERS.map(m => (
            <MarkerCard key={m.id} marker={m} onClick={() => onOpenMarker(m)}/>
          ))}
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Button variant="ghost" size="sm" onClick={onOpenFeed}>Открыть ленту →</Button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ------------------------------------------------------------
// MarkerDetailScreen — full sheet
// ------------------------------------------------------------
function MarkerDetailScreen({ marker, onClose }) {
  const [liked, setLiked] = useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', overflow: 'auto', zIndex: 60 }}>
      {/* photo strip */}
      <div style={{ position: 'relative', height: 280, background: '#0F172A',
                    backgroundImage: marker.photos[0] ? `linear-gradient(135deg, ${marker.photos[0]}, ${marker.photos[1] || marker.photos[0]})` : 'linear-gradient(135deg,#475569,#0F172A)' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, left: 14,
          width: 40, height: 40, borderRadius: 9999,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
          border: 0, cursor: 'pointer', color: '#0F172A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="arrow-left" size={20}/>
        </button>
        <button style={{
          position: 'absolute', top: 14, right: 14,
          width: 40, height: 40, borderRadius: 9999,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
          border: 0, cursor: 'pointer', color: '#0F172A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="share" size={18}/>
        </button>
        {marker.photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {marker.photos.map((_, i) => (
              <span key={i} style={{ width: i === 0 ? 24 : 6, height: 6, background: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', borderRadius: 3 }}/>
            ))}
          </div>
        )}
        {marker.photos.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <Icon name="image" size={48} sw={1.5}/>
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <MarkerPin weight={marker.like_weight} size={32}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {marker.title}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
            </div>
          </div>
        </div>

        {/* author + ttl */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', marginBottom: 16 }}>
          <Avatar name={marker.author.name} size={32} hue={marker.author.hue}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{marker.author.name}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>добавил 3 дня назад</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', background: '#FEF3C7', padding: '4px 10px', borderRadius: 9999 }}>
            <Icon name="clock" size={13} stroke="#92400E"/>
            <span style={{ color: '#92400E', fontWeight: 600 }}>14 д 3 ч</span>
          </div>
        </div>

        {marker.description && (
          <p style={{ fontSize: 15, color: '#0F172A', lineHeight: 1.6, margin: '0 0 16px' }}>
            {marker.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {marker.tags.map(t => <Tag key={t}>#{t}</Tag>)}
        </div>

        {/* counters */}
        <div style={{ display: 'flex', gap: 18, padding: '12px 0', marginBottom: 16, borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: heatFor(marker.like_weight) }}>
              {marker.like_weight >= 0 ? '+' : ''}{marker.like_weight + (liked ? 1 : 0)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>like_weight</div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{marker.comment_count}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>комментариев</div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{marker.view_count.toLocaleString('ru-RU')}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>просмотров</div>
          </div>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <Button variant={liked ? 'primary' : 'secondary'} size="md" onClick={() => setLiked(!liked)} style={{ flex: 1 }}>
            <Icon name="heart" size={16} fill={liked ? '#fff' : 'none'}/>
            Нравится
          </Button>
          <Button variant="secondary" size="md" style={{ flex: 1 }}>
            <Icon name="navigation" size={16}/>
            Маршрут
          </Button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 10 }}>
          Комментарии · {COMMENTS.length}
        </div>
        {COMMENTS.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Avatar name={c.user.name} size={32} hue={c.user.hue}/>
            <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.user.name}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{c.created_at}</span>
              </div>
              <div style={{ fontSize: 14, color: '#0F172A', marginTop: 2, lineHeight: 1.4 }}>{c.text}</div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center', background: '#F1F5F9', borderRadius: 9999, padding: '6px 6px 6px 14px' }}>
          <input placeholder="Написать комментарий…" style={{ flex: 1, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: '#0F172A', outline: 'none' }}/>
          <button style={{ background: '#EF4444', color: '#fff', border: 0, borderRadius: 9999, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// CreateMarkerScreen
// ------------------------------------------------------------
function CreateMarkerScreen({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [ttl, setTtl] = useState('PERIOD');
  const [notif, setNotif] = useState('ON_ENTER');
  const [tags, setTags] = useState(['история']);
  const inputStyle = {
    fontFamily: 'inherit', padding: '11px 14px', border: '1px solid #CBD5E1',
    borderRadius: 10, fontSize: 15, color: '#0F172A', background: '#fff', outline: 'none', width: '100%',
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F8FAFC', overflow: 'auto', zIndex: 60 }}>
      <div style={{ position: 'sticky', top: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', zIndex: 5 }}>
        <button onClick={onClose} style={iconBtnStyle}><Icon name="x" size={22}/></button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Новая метка</div>
        <Button variant="primary" size="sm" onClick={onSubmit}>Создать</Button>
      </div>

      {/* mini-map preview */}
      <div style={{ position: 'relative', height: 160, margin: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#EEF2F6', backgroundImage: 'linear-gradient(0deg, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 120, height: 120, borderRadius: '50%', background: 'rgba(239,68,68,0.10)', border: '1.5px solid rgba(239,68,68,0.45)' }}/>
          <MarkerPin weight={0} size={32}/>
        </div>
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.85)', padding: '3px 8px', borderRadius: 6 }}>
          50.4501, 30.5234 · радиус 200 м
        </div>
      </div>

      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Название</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Золоті ворота" style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>Описание</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Что здесь интересного?" rows={3} style={{ ...inputStyle, resize: 'none' }}/>
        </div>

        {/* photos */}
        <div>
          <label style={labelStyle}>Фото · до 5</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ width: 64, height: 64, borderRadius: 10, border: '2px dashed #CBD5E1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              <Icon name="camera" size={22}/>
            </button>
            <div style={{ width: 64, height: 64, borderRadius: 10, background: 'linear-gradient(135deg,#FCA5A5,#EF4444)' }}/>
            <div style={{ width: 64, height: 64, borderRadius: 10, background: 'linear-gradient(135deg,#FBBF24,#F97316)' }}/>
          </div>
        </div>

        {/* tags */}
        <div>
          <label style={labelStyle}>Теги · до 5</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map(t => <Tag key={t}>#{t}</Tag>)}
            <button style={{ background: 'transparent', border: '1px dashed #CBD5E1', color: '#64748B', padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>+ тег</button>
          </div>
        </div>

        {/* TTL segmented */}
        <div>
          <label style={labelStyle}>Срок жизни</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, background: '#F1F5F9', padding: 4, borderRadius: 12 }}>
            {[['ETERNAL','Навсегда'],['UNTIL_TIME','До даты'],['PERIOD','Период'],['END_OF_DAY','До конца дня']].map(([k,l]) => (
              <button key={k} onClick={()=>setTtl(k)} style={{
                padding: '8px 6px', fontSize: 12, fontWeight: 600,
                border: 0, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                background: ttl === k ? '#fff' : 'transparent',
                color: ttl === k ? '#0F172A' : '#64748B',
                boxShadow: ttl === k ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Notification type */}
        <div>
          <label style={labelStyle}>Уведомлять когда</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, background: '#F1F5F9', padding: 4, borderRadius: 12 }}>
            {[['ON_ENTER','Войду в радиус'],['ON_APPROACH','Подойду близко'],['BOTH','Оба']].map(([k,l]) => (
              <button key={k} onClick={()=>setNotif(k)} style={{
                padding: '8px 6px', fontSize: 12, fontWeight: 600,
                border: 0, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                background: notif === k ? '#fff' : 'transparent',
                color: notif === k ? '#0F172A' : '#64748B',
                boxShadow: notif === k ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* toggles */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          {[['Разрешить лайки', true], ['Разрешить комментарии', true], ['Черновик', false]].map(([label, on], i, arr) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 0 }}>
              <span style={{ flex: 1, fontSize: 14, color: '#0F172A' }}>{label}</span>
              <div style={{ width: 38, height: 22, background: on ? '#EF4444' : '#CBD5E1', borderRadius: 9999, position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, background: '#fff', borderRadius: 9999, transition: 'left 180ms', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: '#475569', marginBottom: 8,
};

// ------------------------------------------------------------
// FeedScreen
// ------------------------------------------------------------
function FeedScreen({ onClose, onOpenMarker }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F8FAFC', overflow: 'auto', zIndex: 60 }}>
      <div style={{ position: 'sticky', top: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', zIndex: 5 }}>
        <button onClick={onClose} style={iconBtnStyle}><Icon name="arrow-left" size={22}/></button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Лента</div>
      </div>

      <div style={{ padding: 16 }}>
        {/* in-app geo-alert toast */}
        <div style={{ background: '#0F172A', color: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, boxShadow: '0 12px 24px rgba(15,23,42,0.25)' }}>
          <div style={{ background: '#EF4444', width: 40, height: 40, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 6px rgba(239,68,68,0.25)' }}>
            <Icon name="bell" size={20} stroke="#fff" sw={2.2}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>Вы рядом с 3 метками</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>«Места Киева» · ≈ 120 м</div>
          </div>
          <Button size="sm" variant="primary">Открыть</Button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 10 }}>
          Подписки · {SUBSCRIBED_CARDS.length}
        </div>

        {SUBSCRIBED_CARDS.map(card => (
          <div key={card.id} style={{ background: '#fff', borderRadius: 14, marginBottom: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</div>
                  <PrivacyBadge value={card.privacy}/>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {card.marker_count} меток · {card.subscriber_count} подписчиков · радиус <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{card.radius} м</span>
                </div>
              </div>
            </div>
            {/* preview markers */}
            <div style={{ padding: '0 8px 6px', display: 'flex', gap: 0 }}>
              {MARKERS.slice(0, 3).map(m => (
                <div key={m.id} onClick={() => onOpenMarker(m)} style={{ flex: 1, padding: '8px', cursor: 'pointer', borderRadius: 10, transition: 'background 120ms' }}
                     onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <MarkerPin weight={m.like_weight} size={22}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 8 }}>
                        <span>♥ {m.like_weight}</span><span>· {m.comment_count} комм.</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, MapScreen, MarkerDetailScreen, CreateMarkerScreen, FeedScreen });
