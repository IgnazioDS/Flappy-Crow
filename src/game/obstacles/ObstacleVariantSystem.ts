import { gapCenterBounds } from '../systems/SpawnSystem'
import type { PipePair } from '../entities/PipePair'
import type { RandomSource } from '../utils/rng'

export type ObstacleVariant = {
  kind: 'static' | 'moving' | 'pulse'
  baseGapY: number
  gapMultiplier: number
  offsetAmplitude: number
  offsetSpeed: number
  offsetPhase: number
  gapPulseAmplitude: number
  gapPulseSpeed: number
  gapPulsePhase: number
}

const VARIANT_CONFIG = {
  movingChance: 0.16,
  pulseChance: 0.12,
  dynamicCooldown: 1,
  gapMultiplierMin: 0.97,
  gapMultiplierMax: 1.03,
  dynamicGapBonus: 0.03,
  movingAmplitudeMin: 6,
  movingAmplitudeMax: 12,
  movingSpeedMin: 0.001,
  movingSpeedMax: 0.0016,
  pulseAmplitudeMin: 0.02,
  pulseAmplitudeMax: 0.05,
  pulseSpeedMin: 0.001,
  pulseSpeedMax: 0.0018,
} as const

export class ObstacleVariantSystem {
  private rng: RandomSource
  private elapsedMs = 0
  private dynamicCooldown = 0

  constructor(rng: RandomSource) {
    this.rng = rng
  }

  update(dtMs: number): void {
    this.elapsedMs += dtMs
  }

  reset(): void {
    this.elapsedMs = 0
    this.dynamicCooldown = 0
  }

  createVariant(baseGapY: number): ObstacleVariant {
    if (this.dynamicCooldown > 0) {
      this.dynamicCooldown -= 1
    }
    const gapMultiplier = this.randomRange(
      VARIANT_CONFIG.gapMultiplierMin,
      VARIANT_CONFIG.gapMultiplierMax,
    )
    const allowDynamic = this.dynamicCooldown === 0
    const roll = this.rng.next()

    if (allowDynamic && roll < VARIANT_CONFIG.movingChance) {
      this.dynamicCooldown = VARIANT_CONFIG.dynamicCooldown
      return {
        kind: 'moving',
        baseGapY,
        gapMultiplier: gapMultiplier + VARIANT_CONFIG.dynamicGapBonus,
        offsetAmplitude: this.randomRange(
          VARIANT_CONFIG.movingAmplitudeMin,
          VARIANT_CONFIG.movingAmplitudeMax,
        ),
        offsetSpeed: this.randomRange(VARIANT_CONFIG.movingSpeedMin, VARIANT_CONFIG.movingSpeedMax),
        offsetPhase: this.randomRange(0, Math.PI * 2),
        gapPulseAmplitude: 0,
        gapPulseSpeed: 0,
        gapPulsePhase: 0,
      }
    }

    if (allowDynamic && roll < VARIANT_CONFIG.movingChance + VARIANT_CONFIG.pulseChance) {
      this.dynamicCooldown = VARIANT_CONFIG.dynamicCooldown
      return {
        kind: 'pulse',
        baseGapY,
        gapMultiplier: gapMultiplier + VARIANT_CONFIG.dynamicGapBonus,
        offsetAmplitude: 0,
        offsetSpeed: 0,
        offsetPhase: 0,
        gapPulseAmplitude: this.randomRange(
          VARIANT_CONFIG.pulseAmplitudeMin,
          VARIANT_CONFIG.pulseAmplitudeMax,
        ),
        gapPulseSpeed: this.randomRange(VARIANT_CONFIG.pulseSpeedMin, VARIANT_CONFIG.pulseSpeedMax),
        gapPulsePhase: this.randomRange(0, Math.PI * 2),
      }
    }

    return {
      kind: 'static',
      baseGapY,
      gapMultiplier,
      offsetAmplitude: 0,
      offsetSpeed: 0,
      offsetPhase: 0,
      gapPulseAmplitude: 0,
      gapPulseSpeed: 0,
      gapPulsePhase: 0,
    }
  }

  applyVariant(pipe: PipePair, variant: ObstacleVariant, baseGap: number): void {
    const pulse =
      variant.kind === 'pulse'
        ? Math.sin(this.elapsedMs * variant.gapPulseSpeed + variant.gapPulsePhase) *
          variant.gapPulseAmplitude
        : 0
    const gap = baseGap * variant.gapMultiplier * (1 + pulse)
    pipe.gap = gap

    let gapY = variant.baseGapY
    if (variant.kind === 'moving') {
      const offset =
        Math.sin(this.elapsedMs * variant.offsetSpeed + variant.offsetPhase) * variant.offsetAmplitude
      gapY = variant.baseGapY + offset
    }
    const { min, max } = gapCenterBounds(gap)
    pipe.gapY = Math.max(min, Math.min(max, gapY))
  }

  private randomRange(min: number, max: number): number {
    return min + this.rng.next() * (max - min)
  }
}
