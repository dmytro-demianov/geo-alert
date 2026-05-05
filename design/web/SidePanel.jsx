// SidePanel.jsx — left drawer (markers list) and right drawer (marker detail)

const { useState: uS } = React;

const HEAT2 = { '-': '#9CA3AF', '0': '#6B7280', '3': '#FBBF24', '6': '#F97316', '11': '#EF4444' };
function heatFor2(w) {
  if (w < 0) return '#9CA3AF';
  if (w <= 2) return '#6B7280';
  if (w <= 5) return '#FBBF24';
  if (w <= 10) return '#F97316';
  return '#EF4444';
}

// ── LEFT DRAWER ─────────────────────────────────────────────────
function LeftDrawer({ open, onClose, markers, onOpenMarker, onCreateCard }) {
  const [tab, setTab] = uS('markers');
  const [filter, setFilter] = uS('all');
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, bottom: 0,
      width: open ? 360 : 0,
      background: '#fff',
      boxShadow: open ? '4px 0 16px rgba(15,23,42,0.10)' : 'none',
      transition: 'width 280ms cubic-bezier(0.2,0,0,1)',
      zIndex: 200, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ width: 360, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', flex: 1 }}>Цікаві місця Києва</div>
            <PrivacyBadge value="PUBLIC"/>
            <button onClick={onClose} style={{ background: 'transparent', border: 0, padding: 4, color: '#64748B', cursor: 'pointer', display: 'flex' }}>
              <Icon name="x" size={18}/>
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#64748B', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span>{markers.length} позначок</span><span>·</span>
            <span>234 підписники</span><span>·</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>радіус 200 м</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #F1F5F9' }}>
            {[['markers', 'Позначки'], ['cards', 'Картки'], ['mine', 'Мої']].map(([k, l]) => (
              <button key={k} onClick={()=>setTab(k)} style={{
                padding: '10px 14px', border: 0, background: 'transparent',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                color: tab === k ? '#EF4444' : '#64748B',
                borderBottom: tab === k ? '2px solid #EF4444' : '2px solid transparent',
                marginBottom: -1,
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        {tab === 'markers' && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
            {[['all','Усі'],['hot','🔥 Гарячі'],['near','Поруч'],['recent','Нові']].map(([k,l]) => (
              <button key={k} onClick={()=>setFilter(k)} style={{
                padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                border: filter === k ? '1px solid #EF4444' : '1px solid #E2E8F0',
                background: filter === k ? '#FEF2F2' : '#fff',
                color: filter === k ? '#B91C1C' : '#475569',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>{l}</button>
            ))}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'markers' && markers.map(m => (
            <div key={m.id} onClick={()=>onOpenMarker(m)} style={{
              padding: '12px 18px', display: 'flex', gap: 12, cursor: 'pointer',
              borderBottom: '1px solid #F1F5F9', transition: 'background 120ms',
            }} onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
               onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <MarkerPin weight={m.like_weight} size={28}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                  <span style={{ background: heatFor2(m.like_weight), color: '#fff', padding: '1px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                    {m.like_weight >= 0 ? '+' : ''}{m.like_weight}
                  </span>
                </div>
                {m.description && (
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 5, color: '#94A3B8', fontSize: 11 }}>
                  <span>♥ {m.like_weight}</span>
                  <span>💬 {m.comment_count}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{m.dist} м</span>
                </div>
              </div>
            </div>
          ))}
          {tab === 'cards' && (
            <div style={{ padding: 14 }}>
              {[
                ['Цікаві місця Києва', 12, 234, 'PUBLIC'],
                ['Скейт-споти Подолу', 8, 31, 'LINK_ONLY'],
                ['Кафе з Wi-Fi', 24, 412, 'PUBLIC'],
                ['Мої улюблені', 5, 0, 'PRIVATE'],
              ].map(([t, mc, sc, p]) => (
                <div key={t} style={{ padding: '12px', border: '1px solid #F1F5F9', borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', flex: 1 }}>{t}</span>
                    <PrivacyBadge value={p}/>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{mc} позначок · {sc} підписників</div>
                </div>
              ))}
              <Button variant="secondary" full onClick={onCreateCard} style={{ marginTop: 4 }}>
                <Icon name="plus" size={16}/> Створити картку
              </Button>
            </div>
          )}
          {tab === 'mine' && (
            <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              У вас поки немає власних позначок.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RIGHT DRAWER (marker detail) ────────────────────────────────
function RightDrawer({ marker, onClose, onDelete, onShare }) {
  const [liked, setLiked] = uS(false);
  if (!marker) return null;
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 420,
      background: '#fff', zIndex: 250, overflow: 'auto',
      boxShadow: '-4px 0 16px rgba(15,23,42,0.10)',
      animation: 'gd-slide-right 280ms cubic-bezier(0.2,0,0,1)',
    }}>
      {/* Photo strip */}
      <div style={{ position: 'relative', height: 240,
                    background: marker.photos[0] ? `linear-gradient(135deg, ${marker.photos[0]}, ${marker.photos[1] || marker.photos[0]})` : 'linear-gradient(135deg,#475569,#0F172A)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 9999, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', border: 0, cursor: 'pointer', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={18}/>
        </button>
        <button onClick={onShare} style={{ position: 'absolute', top: 14, right: 60, width: 36, height: 36, borderRadius: 9999, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', border: 0, cursor: 'pointer', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="share" size={16}/>
        </button>
        {marker.photos.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <Icon name="image" size={48} sw={1.5}/>
          </div>
        )}
      </div>

      <div style={{ padding: '18px 20px 30px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <MarkerPin weight={marker.like_weight} size={28}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{marker.title}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
              {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
            </div>
          </div>
          <button onClick={onDelete} style={{ background: 'transparent', border: 0, padding: 6, color: '#94A3B8', cursor: 'pointer' }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', marginBottom: 14 }}>
          <Avatar name={marker.author.name} size={28} hue={marker.author.hue}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{marker.author.name}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>3 дні тому</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FEF3C7', padding: '4px 10px', borderRadius: 9999, color: '#92400E', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
            <Icon name="clock" size={12} stroke="#92400E"/>
            14 д 3 г
          </div>
        </div>

        {marker.description && (
          <p style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.55, margin: '0 0 14px' }}>{marker.description}</p>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {marker.tags.map(t => <Tag key={t}>#{t}</Tag>)}
        </div>

        <div style={{ display: 'flex', gap: 18, padding: '12px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: heatFor2(marker.like_weight) }}>
              {marker.like_weight >= 0 ? '+' : ''}{marker.like_weight + (liked ? 1 : 0)}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase' }}>like_weight</div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{marker.comment_count}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase' }}>коментарів</div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{marker.view_count}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase' }}>переглядів</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <Button variant={liked ? 'primary' : 'secondary'} onClick={()=>setLiked(!liked)} style={{ flex: 1 }}>
            <Icon name="heart" size={14} fill={liked ? '#fff' : 'none'}/>
            Подобається
          </Button>
          <Button variant="secondary" style={{ flex: 1 }}>
            <Icon name="navigation" size={14}/>
            Маршрут
          </Button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569', marginBottom: 10 }}>
          Коментарі · 3
        </div>
        {[
          { name: 'Михайло', hue: 1, text: 'Чудове місце!', t: '2 г' },
          { name: 'Олена', hue: 3, text: 'Була в неділю — рекомендую раніше за 10:00.', t: '5 г' },
          { name: 'Костя', hue: 2, text: 'А скільки коштує вхід?', t: '1 д' },
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <Avatar name={c.name} size={28} hue={c.hue}/>
            <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{c.name}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{c.t}</span>
              </div>
              <div style={{ fontSize: 13, color: '#0F172A', marginTop: 2 }}>{c.text}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', background: '#F1F5F9', borderRadius: 9999, padding: '5px 5px 5px 14px' }}>
          <input placeholder="Написати коментар…" style={{ flex: 1, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}/>
          <button style={{ background: '#EF4444', color: '#fff', border: 0, borderRadius: 9999, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}

window.LeftDrawer = LeftDrawer;
window.RightDrawer = RightDrawer;
window.heatFor2 = heatFor2;
