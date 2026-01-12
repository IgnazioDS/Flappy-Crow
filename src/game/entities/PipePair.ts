import { GAME_DIMENSIONS, GROUND_HEIGHT, PIPE_CONFIG } from '../config'

export class PipePair {
  x: number
  gapY: number
  scored: boolean

  constructor(x: number, gapY: number) {
    this.x = x
    this.gapY = gapY
    this.scored = false
  }

  update(dt: number): void {
    this.x -= PIPE_CONFIG.speed * dt
  }

  reset(x: number, gapY: number): void {
    this.x = x
    this.gapY = gapY
    this.scored = false
  }

  get topHeight(): number {
    return Math.max(0, this.gapY - PIPE_CONFIG.gap / 2)
  }

  get bottomY(): number {
    return this.gapY + PIPE_CONFIG.gap / 2
  }

  get bottomHeight(): number {
    const groundY = GAME_DIMENSIONS.height - GROUND_HEIGHT
    return Math.max(0, groundY - this.bottomY)
  }
}
