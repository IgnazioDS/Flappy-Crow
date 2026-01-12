import { BIRD_CONFIG, PIPE_CONFIG } from '../config'
import type { Bird } from '../entities/Bird'
import type { PipePair } from '../entities/PipePair'
import { circleIntersectsRect } from '../utils/geometry'

/**
 * Stateless collision helpers for bird vs world.
 */
export class CollisionSystem {
  check(bird: Bird, pipes: PipePair[], groundY: number): boolean {
    if (bird.y + BIRD_CONFIG.radius >= groundY) {
      return true
    }

    for (const pipe of pipes) {
      const topHeight = pipe.topHeight
      const bottomY = pipe.bottomY
      const bottomHeight = pipe.bottomHeight

      if (
        circleIntersectsRect(
          bird.x,
          bird.y,
          BIRD_CONFIG.radius,
          pipe.x,
          0,
          PIPE_CONFIG.width,
          topHeight,
        )
      ) {
        return true
      }

      if (
        circleIntersectsRect(
          bird.x,
          bird.y,
          BIRD_CONFIG.radius,
          pipe.x,
          bottomY,
          PIPE_CONFIG.width,
          bottomHeight,
        )
      ) {
        return true
      }
    }

    return false
  }
}
