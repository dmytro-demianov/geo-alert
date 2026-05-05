// Modals.jsx — all dialogs and side-panels for the web version.
// Self-contained Modal shell + specific modals.

const { useState: uM, useEffect: eM } = React;

function Modal({ open, onClose, children, width = 480, padding = 0 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'gd-fade 180ms cubic-bezier(0.2,0,0,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18,
        boxShadow: '0 24px 48px rgba(15,23,42,0.25), 0 8px 16px rgba(15,23,42,0.12)',
        width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto',
        animation: 'gd-pop 220ms cubic-bezier(0.34,1.56,0.64,1)',
        padding,
      }}>{children}</div>
    </div>
  );
}

function ModalHeader({ title, onClose, subtitle }) {
  return (
    <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'transparent', border: 0, padding: 6, borderRadius: 9999,
          color: '#64748B', cursor: 'pointer', display: 'flex',
        }}><Icon name="x" size={20}/></button>
      )}
    </div>
  );
}

// ── LOGIN ────────────────────────────────────────────────────────
function LoginModal({ open, onClose, onLogin }) {
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div style={{ padding: '36px 32px 28px', textAlign: 'center', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'transparent', border: 0, padding: 6, borderRadius: 9999,
          color: '#94A3B8', cursor: 'pointer',
        }}><Icon name="x" size={18}/></button>
        <img src="../assets/logo-mark.svg" width="64" height="64" alt="" style={{ marginBottom: 16 }}/>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Ласкаво просимо</div>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 8, marginBottom: 24, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
          Увійдіть, щоб створювати позначки, підписуватися на картки та отримувати сповіщення.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="dark" size="lg" full onClick={onLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.5 2.4-2.55 3.8-5.35 3.8-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.45 0 2.75.55 3.75 1.4l2.4-2.4C16.55 3.95 14.4 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.6-3.65 8.6-8.8 0-.4-.05-.75-.1-1.1z"/></svg>
            Увійти через Google
          </Button>
          <Button variant="ghost" size="md" full onClick={onLogin}>Продовжити як гість</Button>
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 22, lineHeight: 1.5 }}>
          Натискаючи «Увійти», ви погоджуєтесь з <a href="#" style={{ color: '#475569' }}>Умовами</a> та <a href="#" style={{ color: '#475569' }}>Політикою конфіденційності</a>
        </div>
      </div>
    </Modal>
  );
}

// ── CREATE MARKER ────────────────────────────────────────────────
const labelStyle2 = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#475569', marginBottom: 8,
};
const inputStyle2 = {
  fontFamily: 'inherit', padding: '10px 14px', border: '1px solid #CBD5E1',
  borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#fff', outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

function CreateMarkerModal({ open, onClose, onSubmit }) {
  const [ttl, setTtl] = uM('PERIOD');
  const [notif, setNotif] = uM('ON_ENTER');
  return (
    <Modal open={open} onClose={onClose} width={640}>
      <ModalHeader title="Нова позначка" subtitle="50.4501, 30.5234 · радіус 200 м" onClose={onClose}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Mini map preview */}
        <div style={{ position: 'relative', height: 280, background: '#EEF2F6',
                      backgroundImage: 'linear-gradient(0deg, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
                      backgroundSize: '24px 24px', borderRight: '1px solid #F1F5F9' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 160, height: 160, borderRadius: '50%', background: 'rgba(239,68,68,0.10)', border: '1.5px solid rgba(239,68,68,0.45)' }}/>
            <MarkerPin weight={0} size={36}/>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 11, color: '#64748B', background: 'rgba(255,255,255,0.85)', padding: '4px 10px', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace' }}>
            перетягніть, щоб змінити
          </div>
        </div>
        {/* Form */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle2}>Назва</label>
            <input placeholder="Золоті ворота" style={inputStyle2}/>
          </div>
          <div>
            <label style={labelStyle2}>Опис</label>
            <textarea placeholder="Що тут цікавого?" rows={3} style={{ ...inputStyle2, resize: 'none' }}/>
          </div>
          <div>
            <label style={labelStyle2}>Теги</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag>#історія</Tag>
              <Tag>#архітектура</Tag>
              <button style={{ background: 'transparent', border: '1px dashed #CBD5E1', color: '#64748B', padding: '4px 10px', borderRadius: 9999, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>+ тег</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 20px' }}>
        <label style={labelStyle2}>Термін дії</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 10, marginBottom: 14 }}>
          {[['ETERNAL','Назавжди'],['UNTIL_TIME','До дати'],['PERIOD','Період'],['END_OF_DAY','До кінця дня']].map(([k,l]) => (
            <button key={k} onClick={()=>setTtl(k)} style={{
              padding: '8px 4px', fontSize: 12, fontWeight: 600, border: 0, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              background: ttl === k ? '#fff' : 'transparent', color: ttl === k ? '#0F172A' : '#64748B',
              boxShadow: ttl === k ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
            }}>{l}</button>
          ))}
        </div>
        <label style={labelStyle2}>Сповіщати коли</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
          {[['ON_ENTER','Увійду в радіус'],['ON_APPROACH','Підійду близько'],['BOTH','Обидва']].map(([k,l]) => (
            <button key={k} onClick={()=>setNotif(k)} style={{
              padding: '8px 4px', fontSize: 12, fontWeight: 600, border: 0, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              background: notif === k ? '#fff' : 'transparent', color: notif === k ? '#0F172A' : '#64748B',
              boxShadow: notif === k ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Скасувати</Button>
        <Button variant="primary" onClick={onSubmit}>Створити позначку</Button>
      </div>
    </Modal>
  );
}

// ── SHARE ────────────────────────────────────────────────────────
function ShareModal({ open, onClose }) {
  const [copied, setCopied] = uM(false);
  return (
    <Modal open={open} onClose={onClose} width={460}>
      <ModalHeader title="Поділитися карткою" subtitle="«Цікаві місця Києва»" onClose={onClose}/>
      <div style={{ padding: 20 }}>
        <label style={labelStyle2}>Посилання</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input readOnly value="https://geo-alert.app/c/kyiv-places-x9k2"
                 style={{ ...inputStyle2, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: '#F8FAFC' }}/>
          <Button variant={copied ? 'soft' : 'primary'} onClick={() => { setCopied(true); setTimeout(()=>setCopied(false), 1500); }}>
            {copied ? <><Icon name="check" size={14}/>Скопійовано</> : 'Копіювати'}
          </Button>
        </div>
        <label style={labelStyle2}>Або поділіться через</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            ['Telegram', '#229ED9', 'send'],
            ['Twitter', '#1DA1F2', 'message'],
            ['Email', '#64748B', 'send'],
            ['QR-код', '#0F172A', 'image'],
          ].map(([name, color, icon]) => (
            <button key={name} style={{
              padding: '14px 8px', border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              fontFamily: 'inherit', fontSize: 12, color: '#0F172A', fontWeight: 500,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={18}/>
              </div>
              {name}
            </button>
          ))}
        </div>
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <PrivacyBadge value="LINK_ONLY"/>
          <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>Картка доступна за посиланням</span>
          <Button variant="ghost" size="sm">Змінити</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── PRIVACY / SUBSCRIBERS ────────────────────────────────────────
function PrivacyModal({ open, onClose }) {
  const [val, setVal] = uM('LINK_ONLY');
  return (
    <Modal open={open} onClose={onClose} width={520}>
      <ModalHeader title="Приватність картки" subtitle="«Цікаві місця Києва»" onClose={onClose}/>
      <div style={{ padding: 20 }}>
        <label style={labelStyle2}>Хто може бачити</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['PUBLIC',    'Публічна',    'Будь-хто може знайти у пошуку'],
            ['LINK_ONLY', 'За посиланням', 'Доступ лише за прямим посиланням'],
            ['PRIVATE',   'Приватна',    'Тільки ви'],
          ].map(([k, l, d]) => (
            <button key={k} onClick={()=>setVal(k)} style={{
              border: val === k ? '2px solid #EF4444' : '1px solid #E2E8F0',
              background: val === k ? '#FEF2F2' : '#fff',
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'inherit',
            }}>
              <PrivacyBadge value={k}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{l}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{d}</div>
              </div>
              {val === k && <Icon name="check" size={18} stroke="#EF4444"/>}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <label style={labelStyle2}>Підписники · 234</label>
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '4px 0', maxHeight: 180, overflow: 'auto' }}>
            {[['Анна К.', 0], ['Михайло', 1], ['Олена', 3], ['Костя', 2], ['Іван П.', 4]].map(([n, h]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
                <Avatar name={n} size={28} hue={h}/>
                <span style={{ flex: 1, fontSize: 13, color: '#0F172A' }}>{n}</span>
                <button style={{ background: 'transparent', border: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 12 }}>прибрати</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onClose}>Скасувати</Button>
        <Button variant="primary" onClick={onClose}>Зберегти</Button>
      </div>
    </Modal>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────
function ProfileModal({ open, onClose, onLogout }) {
  const [tab, setTab] = uM('profile');
  return (
    <Modal open={open} onClose={onClose} width={620}>
      <ModalHeader title="Налаштування" onClose={onClose}/>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', minHeight: 420 }}>
        <div style={{ background: '#F8FAFC', padding: 12, borderRight: '1px solid #F1F5F9' }}>
          {[
            ['profile', 'Профіль', 'user'],
            ['notifications', 'Сповіщення', 'bell'],
            ['privacy', 'Приватність', 'lock'],
            ['map', 'Карта', 'map-pin'],
            ['account', 'Акаунт', 'menu'],
          ].map(([k, l, icon]) => (
            <button key={k} onClick={()=>setTab(k)} style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
              border: 0, background: tab === k ? '#fff' : 'transparent',
              color: tab === k ? '#0F172A' : '#475569',
              boxShadow: tab === k ? '0 1px 3px rgba(15,23,42,0.06)' : 'none',
              fontWeight: tab === k ? 600 : 500, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 2,
            }}>
              <Icon name={icon} size={16}/>{l}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <Avatar name="Дмитро Демʼянов" size={64} hue={2}/>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Дмитро Демʼянов</div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>dmytro@gmail.com</div>
                </div>
                <Button variant="secondary" size="sm" style={{ marginLeft: 'auto' }}>Змінити фото</Button>
              </div>
              <div>
                <label style={labelStyle2}>Імʼя</label>
                <input defaultValue="Дмитро Демʼянов" style={inputStyle2}/>
              </div>
              <div>
                <label style={labelStyle2}>Юзернейм</label>
                <input defaultValue="@dmytro" style={inputStyle2}/>
              </div>
              <div>
                <label style={labelStyle2}>Про себе</label>
                <textarea rows={2} placeholder="Розкажіть про себе" style={{ ...inputStyle2, resize: 'none' }}/>
              </div>
            </div>
          )}
          {tab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Push-сповіщення', true],
                ['Сповіщення про нові позначки поруч', true],
                ['Сповіщення про коментарі', true],
                ['Дайджест раз на тиждень', false],
                ['Email-розсилка', false],
              ].map(([l, on]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ flex: 1, fontSize: 14, color: '#0F172A' }}>{l}</span>
                  <div style={{ width: 38, height: 22, background: on ? '#EF4444' : '#CBD5E1', borderRadius: 9999, position: 'relative', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, background: '#fff', borderRadius: 9999 }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab !== 'profile' && tab !== 'notifications' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 14 }}>
              Розділ «{tab}»
            </div>
          )}
          {tab === 'account' && (
            <div style={{ marginTop: 'auto', padding: '20px 0 0', borderTop: '1px solid #F1F5F9' }}>
              <Button variant="danger" onClick={onLogout}>Вийти з акаунту</Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── COLLECTION (CARD) ────────────────────────────────────────────
function CollectionModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} width={560}>
      <ModalHeader title="Створити картку" subtitle="Картка — це колекція позначок з власним радіусом" onClose={onClose}/>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle2}>Назва</label>
          <input placeholder="Скейт-споти Подолу" style={inputStyle2}/>
        </div>
        <div>
          <label style={labelStyle2}>Опис</label>
          <textarea rows={2} placeholder="Що це за колекція?" style={{ ...inputStyle2, resize: 'none' }}/>
        </div>
        <div>
          <label style={labelStyle2}>Радіус сповіщення</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="range" min="50" max="500" defaultValue="200" style={{ flex: 1, accentColor: '#EF4444' }}/>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#0F172A', width: 70, textAlign: 'right' }}>200 м</span>
          </div>
        </div>
        <div>
          <label style={labelStyle2}>Приватність</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {['PUBLIC','LINK_ONLY','PRIVATE'].map(p => (
              <button key={p} style={{ padding: '10px', border: '1px solid #CBD5E1', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'center' }}>
                <PrivacyBadge value={p}/>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Скасувати</Button>
        <Button variant="primary" onClick={onClose}>Створити</Button>
      </div>
    </Modal>
  );
}

// ── DELETE CONFIRM ──────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title = 'Видалити позначку?', body = 'Цю дію не можна скасувати.' }) {
  return (
    <Modal open={open} onClose={onClose} width={380}>
      <div style={{ padding: '24px 24px 20px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 9999, background: '#FEE2E2', color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="x" size={24} sw={2.4}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>{body}</div>
      </div>
      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Скасувати</Button>
        <Button variant="primary" onClick={onConfirm}>Видалити</Button>
      </div>
    </Modal>
  );
}

Object.assign(window, {
  Modal, ModalHeader,
  LoginModal, CreateMarkerModal, ShareModal, PrivacyModal, ProfileModal, CollectionModal, ConfirmModal,
});
