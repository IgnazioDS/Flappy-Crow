import type { GameEvent, GameState } from './types'

/**
 * Deterministic state machine for core game flow.
 */
export class GameStateMachine {
  private current: GameState = 'BOOT'

  get state(): GameState {
    return this.current
  }

  can(event: GameEvent): boolean {
    switch (this.current) {
      case 'BOOT':
        return event === 'BOOT_COMPLETE'
      case 'READY':
        return event === 'START'
      case 'PLAYING':
        return event === 'HIT'
      case 'GAME_OVER':
        return event === 'RESTART'
      default:
        return false
    }
  }

  transition(event: GameEvent): GameState {
    if (!this.can(event)) {
      return this.current
    }

    switch (event) {
      case 'BOOT_COMPLETE':
        this.current = 'READY'
        break
      case 'START':
        this.current = 'PLAYING'
        break
      case 'HIT':
        this.current = 'GAME_OVER'
        break
      case 'RESTART':
        this.current = 'READY'
        break
    }

    return this.current
  }

  reset(): void {
    this.current = 'BOOT'
  }
}
