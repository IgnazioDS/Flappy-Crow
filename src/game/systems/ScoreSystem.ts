import { PIPE_CONFIG } from '../config'
import type { PipePair } from '../entities/PipePair'

export class ScoreSystem {
  score = 0

  update(birdX: number, pipes: PipePair[]): void {
    for (const pipe of pipes) {
      if (!pipe.scored && pipe.x + PIPE_CONFIG.width < birdX) {
        pipe.scored = true
        this.score += 1
      }
    }
  }

  reset(): void {
    this.score = 0
  }
}
