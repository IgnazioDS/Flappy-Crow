import { describe, expect, it } from 'vitest'
import { GameStateMachine } from './GameStateMachine'

describe('GameStateMachine', () => {
  it('starts in BOOT and ignores invalid transitions', () => {
    const machine = new GameStateMachine()
    expect(machine.state).toBe('BOOT')
    expect(machine.transition('START')).toBe('BOOT')
  })

  it('follows the expected transition path', () => {
    const machine = new GameStateMachine()
    expect(machine.transition('BOOT_COMPLETE')).toBe('READY')
    expect(machine.transition('START')).toBe('PLAYING')
    expect(machine.transition('HIT')).toBe('GAME_OVER')
    expect(machine.transition('RESTART')).toBe('READY')
  })
})
