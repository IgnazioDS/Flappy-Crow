import { describe, expect, it } from 'vitest'
import { StreakSystem } from './StreakSystem'

const rewards = [5, 7, 9, 11, 13, 15, 20]
const system = new StreakSystem(rewards)

const date = (value: string): Date => new Date(`${value}T08:00:00`)

describe('StreakSystem', () => {
  it('allows first claim and sets day 1', () => {
    const result = system.claim({ lastClaimDate: null, streakCount: 0 }, date('2026-02-01'))
    expect(result.status).toBe('claimed')
    expect(result.dayIndex).toBe(1)
    expect(result.coinsAwarded).toBe(5)
    expect(result.state.streakCount).toBe(1)
  })

  it('blocks claim on same day', () => {
    const result = system.claim(
      { lastClaimDate: '2026-02-02', streakCount: 2 },
      date('2026-02-02'),
    )
    expect(result.status).toBe('already_claimed')
    expect(result.coinsAwarded).toBe(0)
  })

  it('increments streak on consecutive days', () => {
    const result = system.claim(
      { lastClaimDate: '2026-02-03', streakCount: 2 },
      date('2026-02-04'),
    )
    expect(result.status).toBe('claimed')
    expect(result.dayIndex).toBe(3)
    expect(result.coinsAwarded).toBe(9)
  })

  it('resets streak after a missed day', () => {
    const result = system.claim(
      { lastClaimDate: '2026-02-03', streakCount: 4 },
      date('2026-02-06'),
    )
    expect(result.status).toBe('claimed')
    expect(result.dayIndex).toBe(1)
    expect(result.coinsAwarded).toBe(5)
  })

  it('loops back to day 1 after day 7', () => {
    const result = system.claim(
      { lastClaimDate: '2026-02-07', streakCount: 7 },
      date('2026-02-08'),
    )
    expect(result.status).toBe('claimed')
    expect(result.dayIndex).toBe(1)
    expect(result.coinsAwarded).toBe(5)
  })
})
