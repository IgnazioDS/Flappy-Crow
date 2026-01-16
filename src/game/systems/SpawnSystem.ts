import { GAME_DIMENSIONS, GROUND_HEIGHT, PIPE_CONFIG } from '../config'
import type { RandomSource } from '../utils/rng'
import { randomRange } from '../utils/rng'

export const gapCenterBounds = (gap = PIPE_CONFIG.gap) => {
  const min = PIPE_CONFIG.topMargin + gap / 2
  const max = GAME_DIMENSIONS.height - GROUND_HEIGHT - PIPE_CONFIG.bottomMargin - gap / 2
  return { min, max }
}

export const generateGapCenterY = (rng: RandomSource, gap = PIPE_CONFIG.gap): number => {
  const { min, max } = gapCenterBounds(gap)
  return randomRange(rng, min, max)
}

export class SpawnSystem {
  private timerMs = PIPE_CONFIG.spawnIntervalMs
  private rng: RandomSource

  constructor(rng: RandomSource) {
    this.rng = rng
  }

  update(dtMs: number, onSpawn: (gapCenterY: number) => void, gap = PIPE_CONFIG.gap): void {
    this.timerMs -= dtMs
    while (this.timerMs <= 0) {
      this.timerMs += PIPE_CONFIG.spawnIntervalMs
      onSpawn(generateGapCenterY(this.rng, gap))
    }
  }

  reset(): void {
    this.timerMs = PIPE_CONFIG.spawnIntervalMs
  }
}
