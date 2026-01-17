import { describe, expect, it } from 'vitest'
import { PIPE_CONFIG } from '../config'
import { getGameModeConfig } from './modeConfig'
import { PRACTICE_CONFIG } from './practiceConfig'
import { computeDifficultyTuning } from './tuning'

describe('computeDifficultyTuning', () => {
  it('keeps standard mode at base tuning on score 0', () => {
    const standard = getGameModeConfig('standard')
    const tuning = computeDifficultyTuning(0, standard.tuning, null)
    expect(tuning.speedScale).toBe(1)
    expect(tuning.gap).toBe(PIPE_CONFIG.gap)
  })

  it('makes casual mode slower with a wider gap at score 0', () => {
    const standard = getGameModeConfig('standard')
    const casual = getGameModeConfig('casual')
    const standardTuning = computeDifficultyTuning(0, standard.tuning, null)
    const casualTuning = computeDifficultyTuning(0, casual.tuning, null)
    expect(casualTuning.speedScale).toBeLessThan(standardTuning.speedScale)
    expect(casualTuning.gap).toBeGreaterThan(standardTuning.gap)
  })

  it('applies practice multipliers to speed and gap', () => {
    const standard = getGameModeConfig('standard')
    const base = computeDifficultyTuning(0, standard.tuning, null)
    const practice = computeDifficultyTuning(0, standard.tuning, PRACTICE_CONFIG)
    expect(practice.speedScale).toBeCloseTo(base.speedScale * PRACTICE_CONFIG.speedMultiplier, 5)
    expect(practice.gap).toBeCloseTo(base.gap * PRACTICE_CONFIG.gapMultiplier, 5)
  })
})
