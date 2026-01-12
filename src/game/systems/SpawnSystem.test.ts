import { describe, expect, it } from 'vitest'
import { gapCenterBounds, generateGapCenterY } from './SpawnSystem'

describe('SpawnSystem gap generator', () => {
  it('keeps gap centers within bounds', () => {
    const { min, max } = gapCenterBounds()
    const rngMin = { next: () => 0 }
    const rngMax = { next: () => 1 }
    expect(generateGapCenterY(rngMin)).toBe(min)
    expect(generateGapCenterY(rngMax)).toBe(max)
  })

  it('produces gaps inside the allowed range over multiple samples', () => {
    const { min, max } = gapCenterBounds()
    let value = 0
    const rng = {
      next: () => {
        value = (value + 0.137) % 1
        return value
      },
    }
    for (let i = 0; i < 50; i += 1) {
      const gap = generateGapCenterY(rng)
      expect(gap).toBeGreaterThanOrEqual(min)
      expect(gap).toBeLessThanOrEqual(max)
    }
  })
})
