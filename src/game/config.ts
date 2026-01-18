/**
 * Central tuning values for the Flappy Bird clone.
 * Adjust these to change difficulty or feel.
 */
export const GAME_DIMENSIONS = {
  width: 360,
  height: 640,
}

export const GROUND_HEIGHT = 80

export const BIRD_CONFIG = {
  x: Math.round(GAME_DIMENSIONS.width * 0.28),
  startY: Math.round(GAME_DIMENSIONS.height * 0.4),
  radius: 12,
  gravity: 1200,
  flapVelocity: -360,
  maxFallSpeed: 600,
  maxRiseSpeed: -420,
  rotationUp: -0.4,
  rotationDown: 1.2,
}

export const PIPE_CONFIG = {
  width: 60,
  gap: 150,
  speed: 160,
  spawnIntervalMs: 1400,
  topMargin: 60,
  bottomMargin: 60,
}

export const DIFFICULTY_CONFIG = {
  maxSpeedScale: 1.3,
  speedScalePerScore: 0.0125,
  minGap: 110,
  gapReductionPerScore: 1.2,
}

export const PERFORMANCE_CONFIG = {
  lowFpsThreshold: 48,
  highFpsThreshold: 56,
  lowFpsWindowMs: 2200,
  recoveryWindowMs: 3200,
} as const
