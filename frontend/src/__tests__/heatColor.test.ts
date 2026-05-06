import { describe, it, expect } from 'vitest'
import { heatColor } from '@/components/ui/MarkerPin'

describe('heatColor', () => {
  it('returns grey for negative weight (disliked)', () => {
    expect(heatColor(-5)).toBe('#9CA3AF')
    expect(heatColor(-1)).toBe('#9CA3AF')
  })

  it('returns dark grey for 0–2 (neutral / low likes)', () => {
    expect(heatColor(0)).toBe('#6B7280')
    expect(heatColor(1)).toBe('#6B7280')
    expect(heatColor(2)).toBe('#6B7280')
  })

  it('returns yellow for 3–5', () => {
    expect(heatColor(3)).toBe('#FBBF24')
    expect(heatColor(5)).toBe('#FBBF24')
  })

  it('returns orange for 6–10', () => {
    expect(heatColor(6)).toBe('#F97316')
    expect(heatColor(10)).toBe('#F97316')
  })

  it('returns red for > 10 (viral)', () => {
    expect(heatColor(11)).toBe('#EF4444')
    expect(heatColor(9999)).toBe('#EF4444')
  })
})
