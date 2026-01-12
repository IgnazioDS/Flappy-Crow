import { describe, expect, it } from 'vitest'
import { circleIntersectsRect, rectsIntersect } from './geometry'

describe('geometry helpers', () => {
  it('detects rectangle intersection', () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 9, y: 9, width: 10, height: 10 },
      ),
    ).toBe(true)
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 11, y: 0, width: 5, height: 5 },
      ),
    ).toBe(false)
  })

  it('detects circle vs rectangle collisions', () => {
    expect(circleIntersectsRect(5, 5, 2, 0, 0, 10, 10)).toBe(true)
    expect(circleIntersectsRect(0, 0, 1, 10, 10, 4, 4)).toBe(false)
    expect(circleIntersectsRect(10, 5, 2, 12, 4, 4, 4)).toBe(true)
  })
})
