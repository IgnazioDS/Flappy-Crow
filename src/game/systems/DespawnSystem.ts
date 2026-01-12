import { PIPE_CONFIG } from '../config'
import type { PipePair } from '../entities/PipePair'

export class DespawnSystem {
  update(active: PipePair[], pool: PipePair[], onDespawn?: (pipe: PipePair, index: number) => void): void {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const pipe = active[i]
      if (pipe.x + PIPE_CONFIG.width < 0) {
        active.splice(i, 1)
        pool.push(pipe)
        if (onDespawn) {
          onDespawn(pipe, i)
        }
      }
    }
  }
}
