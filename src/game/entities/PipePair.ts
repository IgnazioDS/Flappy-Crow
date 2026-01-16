import { GAME_DIMENSIONS, GROUND_HEIGHT, PIPE_CONFIG } from '../config'

export class PipePair {
  x: number
  gapY: number
  gap: number
  scored: boolean

  constructor(x: number, gapY: number, gap = PIPE_CONFIG.gap) {
    this.x = x
    this.gapY = gapY
    this.gap = gap
    this.scored = false
  }

  update(dt: number, speed = PIPE_CONFIG.speed): void {
    this.x -= speed * dt
  }

  reset(x: number, gapY: number, gap = PIPE_CONFIG.gap): void {
    this.x = x
    this.gapY = gapY
    this.gap = gap
    this.scored = false
  }

  get topHeight(): number {
    return Math.max(0, this.gapY - this.gap / 2)
  }

  get bottomY(): number {
    return this.gapY + this.gap / 2
  }

  get bottomHeight(): number {
    const groundY = GAME_DIMENSIONS.height - GROUND_HEIGHT
    return Math.max(0, groundY - this.bottomY)
  }
}
