// TopBarAndChrome.jsx — top bar with logo, search, notifications, user menu
// + map controls (zoom, locate, layer switcher, heat legend)
// + onboarding tooltip + toast

const { useState: uTB } = React;

function TopBar({ loggedIn, onMenu, onSearch, searchOpen, onSearchClose,
                  onNotif, notifOpen, onNotifClose,
                  onUser, userOpen, onUserClose,
                  onLogin, onProfile, onLogout, onCreateCard }) {
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, right: 12,
      height: 56, padding: '0 12px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(15,23,42,0.06)',
      borderRadius: 14,
      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
      display: 'flex', alignItems: 'center', gap: 10, zIndex: 150,
    }}>
      <button onClick={onMenu} style={iconBtn}><Icon name="list" size={20}/></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8, borderRight: '1px solid #E2E8F0' }}>
        <img src="../assets/logo-mark.svg" width="26" height="26" alt=""/>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>Geo-Alert</span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, position: 'relative', maxWidth: 520 }}>
        <div onClick={onSearch} style={{
          background: '#F1F5F9', borderRadius: 9999, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)',
        }}>
          <Icon name="search" size={16} stroke="#94A3B8"/>
          <span style={{ color: '#94A3B8', fontSize: 13 }}>Пошук позначок, місць, тегів…</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94A3B8', background: '#fff', padding: '2px 6px', borderRadius: 4, border: '1px solid #E2E8F0' }}>⌘K</span>
        </div>
        {searchOpen && <SearchDropdown onClose={onSearchClose}/>}
      </div>

      <div style={{ flex: 1 }}/>

      {loggedIn ? (
        <>
          <Button variant="primary" size="sm" onClick={onCreateCard}>
            <Icon name="plus" size={14}/> Нова картка
          </Button>
          <div style={{ position: 'relative' }}>
            <button onClick={onNotif} style={{ ...iconBtn, position: 'relative' }}>
              <Icon name="bell" size={20}/>
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#EF4444', borderRadius: '50%', border: '1.5px solid #fff' }}/>
            </button>
            {notifOpen && <NotificationsDropdown onClose={onNotifClose}/>}
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={onUser} style={{ background: 'transparent', border: 0, padding: 2, borderRadius: 9999, cursor: 'pointer' }}>
              <Avatar name="Дмитро Демʼянов" size={32} hue={2}/>
            </button>
            {userOpen && <UserDropdown onProfile={onProfile} onLogout={onLogout} onClose={onUserClose}/>}
          </div>
        </>
      ) : (
        <Button variant="primary" size="sm" onClick={onLogin}>Увійти</Button>
      )}
    </div>
  );
}

const iconBtn = {
  background: 'transparent', border: 0, width: 36, height: 36,
  borderRadius: 10, cursor: 'pointer', color: '#0F172A',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ── SEARCH DROPDOWN ─────────────────────────────────────────────
function SearchDropdown({ onClose }) {
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
      background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
      boxShadow: '0 12px 24px rgba(15,23,42,0.12)', zIndex: 500, overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="search" size={16} stroke="#64748B"/>
        <input autoFocus placeholder="Введіть запит…" style={{ flex: 1, border: 0, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}/>
        <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#94A3B8', cursor: 'pointer', display: 'flex' }}>
          <Icon name="x" size={16}/>
        </button>
      </div>
      <div style={{ padding: '8px 0' }}>
        <div style={{ padding: '4px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>Фільтри</div>
        <div style={{ padding: '6px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['🔥 Гарячі', 'Поруч 500 м', 'Сьогодні', '📷 З фото', '#історія', '#кафе'].map(t => (
            <button key={t} style={{
              padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
              border: '1px solid #E2E8F0', background: '#fff', color: '#475569',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>Останні</div>
        {['Золоті ворота', 'кав\'ярні', 'парки'].map(q => (
          <button key={q} style={{ width: '100%', textAlign: 'left', padding: '8px 14px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
            <Icon name="clock" size={14} stroke="#94A3B8"/>{q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ───────────────────────────────────────────────
function NotificationsDropdown({ onClose }) {
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 380,
      background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
      boxShadow: '0 12px 24px rgba(15,23,42,0.12)', zIndex: 500, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', flex: 1 }}>Стрічка</span>
        <button style={{ background: 'transparent', border: 0, fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Усе прочитано</button>
      </div>
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {[
          { type: 'near', title: 'Ви поруч з 3 позначками', sub: '«Цікаві місця Києва» · ≈ 120 м', time: 'щойно', unread: true, icon: 'bell', color: '#EF4444' },
          { type: 'comment', title: 'Михайло прокоментував «Золоті ворота»', sub: '«Чудове місце!»', time: '12 хв', unread: true, icon: 'message', color: '#3B82F6' },
          { type: 'like', title: 'Анна К. вподобала «Скейт-парк»', sub: '+1 · тепер 5', time: '1 г', unread: true, icon: 'heart', color: '#EF4444' },
          { type: 'sub', title: 'Нова позначка в «Кафе з Wi-Fi»', sub: 'Кав\'ярня "Один" · додав Михайло', time: '3 г', unread: false, icon: 'map-pin', color: '#10B981' },
          { type: 'expire', title: 'Ваша позначка скоро зникне', sub: '«Виставка фотографій» · 2 г залишилось', time: '5 г', unread: false, icon: 'clock', color: '#F59E0B' },
        ].map((n, i) => (
          <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 10, borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: n.unread ? '#FEF2F2' : '#fff' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9999, background: n.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={n.icon} size={14} sw={2.2}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#0F172A', lineHeight: 1.35, fontWeight: n.unread ? 600 : 500 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{n.sub}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{n.time}</div>
            </div>
            {n.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginTop: 6, flexShrink: 0 }}/>}
          </div>
        ))}
      </div>
      <button style={{ width: '100%', padding: '12px', border: 0, background: '#F8FAFC', cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 600, fontFamily: 'inherit' }}>
        Усі сповіщення →
      </button>
    </div>
  );
}

// ── USER DROPDOWN ───────────────────────────────────────────────
function UserDropdown({ onProfile, onLogout, onClose }) {
  const items = [
    ['Профіль', 'user', onProfile],
    ['Мої позначки', 'map-pin'],
    ['Підписки', 'heart'],
    ['Налаштування', 'menu', onProfile],
  ];
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 240,
      background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
      boxShadow: '0 12px 24px rgba(15,23,42,0.12)', zIndex: 500, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Avatar name="Дмитро Демʼянов" size={36} hue={2}/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Дмитро Демʼянов</div>
          <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>dmytro@gmail.com</div>
        </div>
      </div>
      <div style={{ padding: 4 }}>
        {items.map(([l, ic, fn]) => (
          <button key={l} onClick={fn} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 6, fontFamily: 'inherit' }}>
            <Icon name={ic} size={14} stroke="#64748B"/>{l}
          </button>
        ))}
      </div>
      <div style={{ padding: 4, borderTop: '1px solid #F1F5F9' }}>
        <button onClick={onLogout} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#B91C1C', fontFamily: 'inherit', borderRadius: 6 }}>
          Вийти
        </button>
      </div>
    </div>
  );
}

// ── MAP CONTROLS (zoom, locate, layer) ──────────────────────────
function MapControls({ onLocate, onLayer, layerOpen, onLayerClose, mapTheme, onChangeTheme }) {
  return (
    <>
      {/* Zoom + locate cluster, right side */}
      <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 100 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
          <button style={{ ...controlBtn, borderBottom: '1px solid #F1F5F9' }}><Icon name="plus" size={18}/></button>
          <button style={controlBtn}><Icon name="x" size={18} sw={2.5} style={{ transform: 'rotate(45deg)' }}/></button>
        </div>
        <button onClick={onLocate} style={{ ...controlBtn, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}>
          <Icon name="crosshair" size={20} stroke="#475569"/>
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={onLayer} style={{ ...controlBtn, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}>
            <Icon name="image" size={20} stroke="#475569"/>
          </button>
          {layerOpen && (
            <div onClick={e=>e.stopPropagation()} style={{
              position: 'absolute', right: 'calc(100% + 8px)', top: 0, width: 200,
              background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
              boxShadow: '0 12px 24px rgba(15,23,42,0.12)', zIndex: 500, overflow: 'hidden',
            }}>
              <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>Шари мапи</div>
              {[
                ['light', 'Світла', '#EEF2F6'],
                ['dark', 'Темна', '#0F172A'],
                ['satellite', 'Супутник', '#3F4A3A'],
              ].map(([k, l, c]) => (
                <button key={k} onClick={()=>{ onChangeTheme(k); onLayerClose(); }} style={{
                  width: '100%', padding: '10px 12px', border: 0, background: mapTheme === k ? '#FEF2F2' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: 'inherit', fontSize: 13, color: '#0F172A',
                }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: c, border: '1px solid #E2E8F0' }}/>
                  <span style={{ flex: 1, textAlign: 'left' }}>{l}</span>
                  {mapTheme === k && <Icon name="check" size={14} stroke="#EF4444"/>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const controlBtn = {
  width: 40, height: 40, border: 0, background: 'transparent',
  cursor: 'pointer', color: '#0F172A',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ── HEAT LEGEND ─────────────────────────────────────────────────
function HeatLegend() {
  const items = [
    ['#9CA3AF', '<0', 'Холодні'],
    ['#6B7280', '0–2', 'Нейтральні'],
    ['#FBBF24', '3–5', 'Теплі'],
    ['#F97316', '6–10', 'Гарячі'],
    ['#EF4444', '11+', '🔥'],
  ];
  return (
    <div style={{
      position: 'absolute', left: 20, bottom: 20, zIndex: 90,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
      borderRadius: 12, border: '1px solid rgba(15,23,42,0.06)',
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>
        Heat scale · like_weight
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {items.map(([c, r, l]) => (
          <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 22, position: 'relative' }}>
              <svg viewBox="0 0 32 40" width="18" height="22"><path d="M16 1C8.27 1 2 7.27 2 15c0 10.5 14 24 14 24s14-13.5 14-24C30 7.27 23.73 1 16 1z" fill={c} stroke="#fff" strokeWidth="2"/><circle cx="16" cy="15" r="5" fill="#fff"/></svg>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#475569', fontWeight: 600 }}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ONBOARDING TOOLTIP ──────────────────────────────────────────
function OnboardingTooltip({ onDismiss }) {
  return (
    <div style={{
      position: 'absolute', top: 84, right: 78, zIndex: 200,
      background: '#0F172A', color: '#fff', padding: '12px 14px',
      borderRadius: 12, maxWidth: 240,
      boxShadow: '0 12px 24px rgba(15,23,42,0.30)',
    }}>
      <div style={{
        position: 'absolute', top: -6, right: 30,
        width: 12, height: 12, background: '#0F172A',
        transform: 'rotate(45deg)',
      }}/>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, position: 'relative' }}>👋 Підказка</div>
      <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.45, position: 'relative' }}>
        Клікніть на будь-якому місці мапи, щоб створити позначку.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, position: 'relative' }}>
        <button onClick={onDismiss} style={{ background: '#EF4444', color: '#fff', border: 0, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Зрозуміло</button>
        <button onClick={onDismiss} style={{ background: 'transparent', color: '#94A3B8', border: 0, padding: '5px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Більше не показувати</button>
      </div>
    </div>
  );
}

// ── TOAST ───────────────────────────────────────────────────────
function ProximityToast({ onClose, onOpen }) {
  return (
    <div style={{
      position: 'absolute', top: 84, left: '50%', transform: 'translateX(-50%)',
      zIndex: 300, background: '#0F172A', color: '#fff',
      borderRadius: 14, padding: '12px 16px',
      display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: '0 12px 24px rgba(15,23,42,0.30)',
      maxWidth: 440, minWidth: 360,
      animation: 'gd-slide-down 320ms cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{ background: '#EF4444', width: 36, height: 36, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 5px rgba(239,68,68,0.25)' }}>
        <Icon name="bell" size={18} stroke="#fff" sw={2.2}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>Ви поруч з 3 позначками</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>«Цікаві місця Києва» · ≈ 120 м</div>
      </div>
      <Button size="sm" variant="primary" onClick={onOpen}>Відкрити</Button>
      <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#94A3B8', cursor: 'pointer', padding: 4, display: 'flex' }}>
        <Icon name="x" size={16}/>
      </button>
    </div>
  );
}

Object.assign(window, { TopBar, MapControls, HeatLegend, OnboardingTooltip, ProximityToast });
