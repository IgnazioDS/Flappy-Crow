import { GAME_DIMENSIONS, GROUND_HEIGHT } from '../config'

export class Ground {
  readonly y: number
  readonly height: number

  constructor() {
    this.height = GROUND_HEIGHT
    this.y = GAME_DIMENSIONS.height - this.height
  }
}
