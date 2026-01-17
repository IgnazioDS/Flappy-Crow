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
      amplitude: 0,
      speed: 0,
      phase: 0,
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
      amplitude: 100,
      speed: 1,
      phase: -Math.PI / 2,
    }

    system.applyVariant(pipe, variant, PIPE_CONFIG.gap)

    expect(pipe.gapY).toBe(min)
    expect(pipe.gapY).toBeLessThanOrEqual(max)
  })
})
