import { GAME_DIMENSIONS, GROUND_HEIGHT, PIPE_CONFIG } from '../config'
import type { RandomSource } from '../utils/rng'
import { randomRange } from '../utils/rng'

export const gapCenterBounds = () => {
  const min = PIPE_CONFIG.topMargin + PIPE_CONFIG.gap / 2
  const max =
    GAME_DIMENSIONS.height - GROUND_HEIGHT - PIPE_CONFIG.bottomMargin - PIPE_CONFIG.gap / 2
  return { min, max }
}

export const generateGapCenterY = (rng: RandomSource): number => {
  const { min, max } = gapCenterBounds()
  return randomRange(rng, min, max)
}

export class SpawnSystem {
  private timerMs = PIPE_CONFIG.spawnIntervalMs
  private rng: RandomSource

  constructor(rng: RandomSource) {
    this.rng = rng
  }

  update(dtMs: number, onSpawn: (gapCenterY: number) => void): void {
    this.timerMs -= dtMs
    while (this.timerMs <= 0) {
      this.timerMs += PIPE_CONFIG.spawnIntervalMs
      onSpawn(generateGapCenterY(this.rng))
    }
  }

  reset(): void {
    this.timerMs = PIPE_CONFIG.spawnIntervalMs
  }
}
