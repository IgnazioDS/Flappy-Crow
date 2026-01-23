export type StreakState = {
  lastClaimDate: string | null
  streakCount: number
}

export type ClaimPreview = {
  canClaim: boolean
  dayIndex: number
  coins: number
  statusLabel: 'READY' | 'CLAIMED'
}

export type ClaimResult = {
  status: 'claimed' | 'already_claimed'
  state: StreakState
  coinsAwarded: number
  dayIndex: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export class StreakSystem {
  private rewards: number[]

  constructor(rewards: number[]) {
    this.rewards = rewards.length > 0 ? rewards : [0]
  }

  getClaimPreview(state: StreakState, now: Date): ClaimPreview {
    const todayKey = toDayKey(now)
    const diff = this.getDiffDays(state.lastClaimDate, todayKey)
    if (diff === 0) {
      const dayIndex = this.clampDayIndex(state.streakCount)
      return {
        canClaim: false,
        dayIndex,
        coins: this.getRewardCoins(dayIndex),
        statusLabel: 'CLAIMED',
      }
    }

    const nextCount = this.getNextCount(state, diff)
    const dayIndex = this.clampDayIndex(nextCount)
    return {
      canClaim: true,
      dayIndex,
      coins: this.getRewardCoins(dayIndex),
      statusLabel: 'READY',
    }
  }

  claim(state: StreakState, now: Date): ClaimResult {
    const preview = this.getClaimPreview(state, now)
    const todayKey = toDayKey(now)
    if (!preview.canClaim) {
      return {
        status: 'already_claimed',
        state,
        coinsAwarded: 0,
        dayIndex: preview.dayIndex,
      }
    }

    const nextState: StreakState = {
      lastClaimDate: todayKey,
      streakCount: preview.dayIndex,
    }
    return {
      status: 'claimed',
      state: nextState,
      coinsAwarded: preview.coins,
      dayIndex: preview.dayIndex,
    }
  }

  private getRewardCoins(dayIndex: number): number {
    if (this.rewards.length === 0) {
      return 0
    }
    const index = Math.min(Math.max(dayIndex - 1, 0), this.rewards.length - 1)
    return this.rewards[index]
  }

  private clampDayIndex(count: number): number {
    const max = this.rewards.length
    if (max <= 0) {
      return 1
    }
    const normalized = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
    if (normalized > max) {
      return 1
    }
    return normalized
  }

  private getNextCount(state: StreakState, diff: number): number {
    if (diff === 1 && state.streakCount > 0) {
      const next = state.streakCount + 1
      return next > this.rewards.length ? 1 : next
    }
    return 1
  }

  private getDiffDays(lastClaimDate: string | null, todayKey: string): number {
    if (!lastClaimDate) {
      return Number.POSITIVE_INFINITY
    }
    const lastDate = fromDayKey(lastClaimDate)
    const todayDate = fromDayKey(todayKey)
    if (!lastDate || !todayDate) {
      return Number.POSITIVE_INFINITY
    }
    const diff = startOfDay(todayDate).getTime() - startOfDay(lastDate).getTime()
    return Math.round(diff / MS_PER_DAY)
  }
}

export const toDayKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromDayKey = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  return new Date(year, month - 1, day)
}

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())
