import { gapCenterBounds } from '../systems/SpawnSystem'
import type { PipePair } from '../entities/PipePair'
import type { RandomSource } from '../utils/rng'

export type ObstacleVariant = {
  kind: 'static' | 'moving'
  baseGapY: number
  gapMultiplier: number
  amplitude: number
  speed: number
  phase: number
}

const VARIANT_CONFIG = {
  movingChance: 0.18,
  gapMultiplierMin: 0.97,
  gapMultiplierMax: 1.03,
  amplitudeMin: 6,
  amplitudeMax: 14,
  speedMin: 0.001,
  speedMax: 0.0018,
} as const

export class ObstacleVariantSystem {
  private rng: RandomSource
  private elapsedMs = 0

  constructor(rng: RandomSource) {
    this.rng = rng
  }

  update(dtMs: number): void {
    this.elapsedMs += dtMs
  }

  reset(): void {
    this.elapsedMs = 0
  }

  createVariant(baseGapY: number): ObstacleVariant {
    const gapMultiplier = this.randomRange(
      VARIANT_CONFIG.gapMultiplierMin,
      VARIANT_CONFIG.gapMultiplierMax,
    )
    if (this.rng.next() >= VARIANT_CONFIG.movingChance) {
      return {
        kind: 'static',
        baseGapY,
        gapMultiplier,
        amplitude: 0,
        speed: 0,
        phase: 0,
      }
    }

    return {
      kind: 'moving',
      baseGapY,
      gapMultiplier,
      amplitude: this.randomRange(VARIANT_CONFIG.amplitudeMin, VARIANT_CONFIG.amplitudeMax),
      speed: this.randomRange(VARIANT_CONFIG.speedMin, VARIANT_CONFIG.speedMax),
      phase: this.randomRange(0, Math.PI * 2),
    }
  }

  applyVariant(pipe: PipePair, variant: ObstacleVariant, baseGap: number): void {
    const gap = baseGap * variant.gapMultiplier
    pipe.gap = gap

    if (variant.kind === 'static') {
      pipe.gapY = variant.baseGapY
      return
    }

    const offset = Math.sin(this.elapsedMs * variant.speed + variant.phase) * variant.amplitude
    const { min, max } = gapCenterBounds(gap)
    const nextGapY = Math.max(min, Math.min(max, variant.baseGapY + offset))
    pipe.gapY = nextGapY
  }

  private randomRange(min: number, max: number): number {
    return min + this.rng.next() * (max - min)
  }
}
