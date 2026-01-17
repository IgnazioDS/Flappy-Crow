import { DIFFICULTY_CONFIG, PIPE_CONFIG } from '../config'
import type { GameModeTuning } from './modeConfig'
type PracticeTuning = {
  speedMultiplier: number
  gapMultiplier: number
}

export const computeDifficultyTuning = (
  score: number,
  tuning: GameModeTuning,
  practice?: PracticeTuning | null,
): { speedScale: number; gap: number } => {
  const speedScalePerScore = tuning.speedScalePerScore ?? DIFFICULTY_CONFIG.speedScalePerScore
  const maxSpeedScale = tuning.maxSpeedScale ?? DIFFICULTY_CONFIG.maxSpeedScale
  const rawSpeedScale = (1 + score * speedScalePerScore) * tuning.speedMultiplier
  let speedScale = Math.min(maxSpeedScale, rawSpeedScale)

  const gapReductionPerScore = tuning.gapReductionPerScore ?? DIFFICULTY_CONFIG.gapReductionPerScore
  const minGap = tuning.minGap ?? DIFFICULTY_CONFIG.minGap
  const baseGap = PIPE_CONFIG.gap * tuning.gapMultiplier
  let gap = Math.max(minGap, baseGap - score * gapReductionPerScore)

  if (practice) {
    speedScale *= practice.speedMultiplier
    gap *= practice.gapMultiplier
  }

  return { speedScale, gap }
}
