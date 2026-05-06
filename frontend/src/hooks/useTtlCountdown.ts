import { useState, useEffect } from 'react'
import type { ExpirationType } from '@/api/markers'

export function formatTtl(ms: number): string {
  if (ms <= 0) return 'Истекла'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (days > 0) return `${days}д ${hours}ч`
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function useTtlCountdown(
  expirationType: ExpirationType,
  expiresAt: string | null,
): { label: string; expired: boolean; critical: boolean } {
  const [remaining, setRemaining] = useState<number>(() => {
    if (expirationType === 'ETERNAL' || !expiresAt) return -1
    return new Date(expiresAt).getTime() - Date.now()
  })

  useEffect(() => {
    if (expirationType === 'ETERNAL' || !expiresAt) return
    const target = new Date(expiresAt).getTime()
    const tick = () => setRemaining(target - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expirationType, expiresAt])

  if (expirationType === 'ETERNAL' || !expiresAt) {
    return { label: '', expired: false, critical: false }
  }

  if (remaining <= 0) {
    return { label: 'Истекла', expired: true, critical: false }
  }

  return {
    label: formatTtl(remaining),
    expired: false,
    critical: remaining < 10 * 60 * 1000,
  }
}
