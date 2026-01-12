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
