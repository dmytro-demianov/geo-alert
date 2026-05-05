import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './ui/Icon'
import Avatar from './ui/Avatar'
import { useAuthStore } from '@/store/auth'
import { logoutRequest } from '@/api/auth'

interface TopBarProps {
  onMenuToggle: () => void
  onCreateCard: () => void
}

function SearchBar() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="flex-1 relative max-w-[520px]">
      <div
        onClick={() => setOpen(true)}
        className="bg-slate-100 rounded-full px-3.5 py-2 flex items-center gap-2 cursor-pointer shadow-inset"
      >
        <Icon name="search" size={15} stroke="#94A3B8" />
        <span className="text-slate-400 text-[13px] flex-1">Пошук позначок, місць, тегів…</span>
        <kbd className="font-mono text-[11px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">⌘K</kbd>
      </div>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-lg border border-slate-200 shadow-lg z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
            <Icon name="search" size={15} stroke="#64748B" />
            <input
              autoFocus
              placeholder="Введіть запит…"
              className="flex-1 border-0 text-sm outline-none bg-transparent"
            />
            <button onClick={() => setOpen(false)} className="text-slate-400 flex">
              <Icon name="x" size={15} />
            </button>
          </div>
          <div className="py-2">
            <div className="px-3.5 py-1 text-[10px] font-bold tracking-widest uppercase text-slate-400">Фільтри</div>
            <div className="px-3.5 py-2 flex flex-wrap gap-1.5">
              {['🔥 Гарячі', 'Поруч 500 м', 'Сьогодні', '📷 З фото', '#історія', '#кафе'].map((t) => (
                <button key={t} className="px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  {t}
                </button>
              ))}
            </div>
            <div className="px-3.5 py-1 text-[10px] font-bold tracking-widest uppercase text-slate-400">Останні</div>
            {["Золоті ворота", "кав'ярні", 'парки'].map((q) => (
              <button key={q} className="w-full text-left px-3.5 py-2 text-sm text-slate-900 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                <Icon name="clock" size={13} stroke="#94A3B8" />{q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications = [
    { icon: 'bell', color: '#EF4444', title: 'Ви поруч з 3 позначками', sub: '«Цікаві місця Києва» · ≈ 120 м', time: 'щойно', unread: true },
    { icon: 'message', color: '#3B82F6', title: 'Михайло прокоментував «Золоті ворота»', sub: '«Чудове місце!»', time: '12 хв', unread: true },
    { icon: 'heart', color: '#EF4444', title: 'Анна К. вподобала «Скейт-парк»', sub: '+1 · тепер 5', time: '1 г', unread: true },
    { icon: 'map-pin', color: '#10B981', title: 'Нова позначка в «Кафе з Wi-Fi»', sub: "Кав'ярня \"Один\" · додав Михайло", time: '3 г', unread: false },
    { icon: 'clock', color: '#F59E0B', title: 'Ваша позначка скоро зникне', sub: '«Виставка фотографій» · 2 г залишилось', time: '5 г', unread: false },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Icon name="bell" size={20} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border-[1.5px] border-white" />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 w-[380px] bg-white rounded-lg border border-slate-200 shadow-lg z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center">
            <span className="text-sm font-bold text-slate-900 flex-1">Стрічка</span>
            <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">Усе прочитано</button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((n, i) => (
              <div key={i} className={`px-4 py-3 flex gap-2.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${n.unread ? 'bg-brand-50' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: n.color }}>
                  <Icon name={n.icon} size={14} stroke="white" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] text-slate-900 leading-snug ${n.unread ? 'font-semibold' : 'font-medium'}`}>{n.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{n.sub}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{n.time}</div>
                </div>
                {n.unread && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
          <button className="w-full py-3 bg-slate-50 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
            Усі сповіщення →
          </button>
        </div>
      )}
    </div>
  )
}

function UserButton({ onLogin }: { onLogin: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isAuthenticated) {
    return (
      <button
        onClick={onLogin}
        className="px-3.5 py-1.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 active:scale-95 transition-all"
      >
        Увійти
      </button>
    )
  }

  const displayName = user?.display_name ?? 'Користувач'

  const items: { label: string; icon: string; path: string }[] = [
    { label: 'Профіль', icon: 'user', path: user ? `/users/${user.id}` : '/' },
    { label: 'Стрічка активності', icon: 'list', path: '/feed' },
    { label: 'Мої позначки', icon: 'map-pin', path: '/my-cards' },
    { label: 'Підписки', icon: 'heart', path: '/' },
    { label: 'Заблоковані', icon: 'alert-circle', path: '/settings/blocked' },
  ]

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="rounded-full p-0.5 hover:ring-2 hover:ring-brand-200 transition-all">
        <Avatar name={displayName} size={32} avatarUrl={user?.avatar_url} />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 w-[240px] bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3.5 py-3 border-b border-slate-100 flex gap-2.5 items-center">
            <Avatar name={displayName} size={36} avatarUrl={user?.avatar_url} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-900 truncate">{displayName}</div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="p-1">
            {items.map(({ label, icon, path }) => (
              <button
                key={label}
                onClick={() => { setOpen(false); navigate(path) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-slate-900 hover:bg-slate-50 rounded-md transition-colors text-left"
              >
                <Icon name={icon} size={14} stroke="#64748B" />
                {label}
              </button>
            ))}
          </div>
          <div className="p-1 border-t border-slate-100">
            <button
              onClick={() => {
                setOpen(false)
                logoutRequest().catch(() => {}).finally(() => {
                  logout()
                  navigate('/login', { replace: true })
                })
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-red-700 hover:bg-red-50 rounded-md transition-colors text-left"
            >
              <Icon name="log-out" size={14} stroke="#B91C1C" />
              Вийти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TopBar({ onMenuToggle, onCreateCard }: TopBarProps) {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="absolute top-3 left-3 right-3 h-14 z-[150] px-3 flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-slate-900/[0.06] rounded-lg shadow-md">
      <button
        onClick={onMenuToggle}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
      >
        <Icon name="list" size={20} />
      </button>

      <div className="flex items-center gap-2 pr-2.5 border-r border-slate-200 flex-shrink-0">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <path d="M16 2C9.37 2 4 7.37 4 14c0 9.5 12 18 12 18s12-8.5 12-18C28 7.37 22.63 2 16 2z" fill="#EF4444" />
          <circle cx="16" cy="14" r="5" fill="white" />
        </svg>
        <span className="text-[16px] font-extrabold text-slate-900 tracking-tight">Geo-Alert</span>
      </div>

      <SearchBar />

      <div className="flex-1" />

      {isAuthenticated && (
        <button
          onClick={onCreateCard}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-[13px] font-semibold rounded-lg hover:bg-brand-600 active:scale-95 transition-all flex-shrink-0"
        >
          <Icon name="plus" size={14} stroke="white" />
          Нова картка
        </button>
      )}

      <NotificationsButton />
      <UserButton onLogin={() => navigate('/login')} />
    </div>
  )
}
