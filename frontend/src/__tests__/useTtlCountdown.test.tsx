import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTtlCountdown } from '@/hooks/useTtlCountdown'

describe('useTtlCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty label for ETERNAL markers', () => {
    const { result } = renderHook(() => useTtlCountdown('ETERNAL', null))
    expect(result.current.label).toBe('')
    expect(result.current.expired).toBe(false)
    expect(result.current.critical).toBe(false)
  })

  it('returns expired=true when expiresAt is in the past', () => {
    const past = new Date(Date.now() - 5000).toISOString()
    const { result } = renderHook(() => useTtlCountdown('UNTIL_TIME', past))
    expect(result.current.expired).toBe(true)
    expect(result.current.label).toBe('Истекла')
  })

  it('marks critical when less than 10 minutes remain', () => {
    const fiveMinutes = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const { result } = renderHook(() => useTtlCountdown('UNTIL_TIME', fiveMinutes))
    expect(result.current.critical).toBe(true)
    expect(result.current.expired).toBe(false)
  })

  it('not critical when more than 10 minutes remain', () => {
    const thirtyMinutes = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const { result } = renderHook(() => useTtlCountdown('UNTIL_TIME', thirtyMinutes))
    expect(result.current.critical).toBe(false)
    expect(result.current.expired).toBe(false)
  })

  it('updates label as time advances', () => {
    const expiresAt = new Date(Date.now() + 65_000).toISOString()
    const { result } = renderHook(() => useTtlCountdown('UNTIL_TIME', expiresAt))

    const labelBefore = result.current.label

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.label).not.toBe(labelBefore)
    expect(result.current.expired).toBe(false)
  })
})
