import { describe, expect, it } from 'vitest'
import { PIPE_CONFIG } from '../config'
import { PipePair } from '../entities/PipePair'
import { gapCenterBounds } from '../systems/SpawnSystem'
import { ObstacleVariantSystem, type ObstacleVariant } from './ObstacleVariantSystem'

describe('ObstacleVariantSystem', () => {
  it('keeps static variants at their base gap', () => {
    const system = new ObstacleVariantSystem({ next: () => 0 })
    const pipe = new PipePair(0, 0, PIPE_CONFIG.gap)
    const variant: ObstacleVariant = {
      kind: 'static',
      baseGapY: 220,
      gapMultiplier: 1,
      offsetAmplitude: 0,
      offsetSpeed: 0,
      offsetPhase: 0,
      gapPulseAmplitude: 0,
      gapPulseSpeed: 0,
      gapPulsePhase: 0,
    }

    system.applyVariant(pipe, variant, PIPE_CONFIG.gap)

    expect(pipe.gapY).toBe(220)
    expect(pipe.gap).toBe(PIPE_CONFIG.gap)
  })

  it('clamps moving gaps within bounds', () => {
    const system = new ObstacleVariantSystem({ next: () => 0 })
    const pipe = new PipePair(0, 0, PIPE_CONFIG.gap)
    const { min, max } = gapCenterBounds(PIPE_CONFIG.gap)
    const variant: ObstacleVariant = {
      kind: 'moving',
      baseGapY: min,
      gapMultiplier: 1,
      offsetAmplitude: 100,
      offsetSpeed: 1,
      offsetPhase: -Math.PI / 2,
      gapPulseAmplitude: 0,
      gapPulseSpeed: 0,
      gapPulsePhase: 0,
    }

    system.applyVariant(pipe, variant, PIPE_CONFIG.gap)

    expect(pipe.gapY).toBe(min)
    expect(pipe.gapY).toBeLessThanOrEqual(max)
  })

  it('applies pulse variants to the gap size', () => {
    const system = new ObstacleVariantSystem({ next: () => 0 })
    const pipe = new PipePair(0, 0, PIPE_CONFIG.gap)
    const variant: ObstacleVariant = {
      kind: 'pulse',
      baseGapY: 200,
      gapMultiplier: 1,
      offsetAmplitude: 0,
      offsetSpeed: 0,
      offsetPhase: 0,
      gapPulseAmplitude: 0.1,
      gapPulseSpeed: 0,
      gapPulsePhase: Math.PI / 2,
    }

    system.applyVariant(pipe, variant, PIPE_CONFIG.gap)

    expect(pipe.gap).toBeCloseTo(PIPE_CONFIG.gap * 1.1)
    expect(pipe.gapY).toBe(200)
  })
})
