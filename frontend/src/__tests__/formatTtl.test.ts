import { describe, it, expect } from 'vitest'
import { formatTtl } from '@/hooks/useTtlCountdown'

describe('formatTtl', () => {
  it('returns "Истекла" for zero ms', () => {
    expect(formatTtl(0)).toBe('Истекла')
  })

  it('returns "Истекла" for negative ms', () => {
    expect(formatTtl(-1000)).toBe('Истекла')
  })

  it('formats seconds correctly', () => {
    expect(formatTtl(45_000)).toBe('00:00:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatTtl(90_000)).toBe('00:01:30')
  })

  it('formats hours, minutes and seconds', () => {
    expect(formatTtl(3_661_000)).toBe('01:01:01')
  })

  it('formats days and hours (no seconds)', () => {
    const twoDaysThreeHours = (2 * 86400 + 3 * 3600) * 1000
    expect(formatTtl(twoDaysThreeHours)).toBe('2д 3ч')
  })

  it('shows 0ч when less than one full hour remains within a day boundary', () => {
    const oneDayExact = 86400 * 1000
    expect(formatTtl(oneDayExact)).toBe('1д 0ч')
  })
})
