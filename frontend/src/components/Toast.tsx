/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import Icon from './ui/Icon'

export interface ToastItem {
  id: string
  message: string
  type?: 'info' | 'success' | 'error'
}

type Listener = (item: ToastItem) => void

const listeners = new Set<Listener>()

export function showToast(message: string, type: ToastItem['type'] = 'info') {
  const item: ToastItem = { id: crypto.randomUUID(), message, type }
  listeners.forEach((l) => l(item))
}

const ICONS: Record<string, string> = {
  info: 'bell',
  success: 'check-circle',
  error: 'alert-circle',
}

const COLORS: Record<string, string> = {
  info: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener = (item: ToastItem) => {
      setToasts((prev) => [...prev, item])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 4000)
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl shadow-lg border border-slate-200 text-[13px] text-slate-900 font-medium max-w-[340px] pointer-events-auto animate-fade-in"
        >
          <Icon
            name={ICONS[t.type ?? 'info']}
            size={16}
            stroke={COLORS[t.type ?? 'info']}
          />
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
