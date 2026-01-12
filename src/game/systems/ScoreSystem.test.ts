import { describe, expect, it } from 'vitest'
import { PIPE_CONFIG } from '../config'
import { PipePair } from '../entities/PipePair'
import { ScoreSystem } from './ScoreSystem'

describe('ScoreSystem', () => {
  it('increments score only once per pipe pair', () => {
    const scoreSystem = new ScoreSystem()
    const birdX = 200
    const pipe = new PipePair(birdX - PIPE_CONFIG.width - 1, 200)
    scoreSystem.update(birdX, [pipe])
    expect(scoreSystem.score).toBe(1)
    scoreSystem.update(birdX, [pipe])
    expect(scoreSystem.score).toBe(1)
  })

  it('does not score before passing the pipe', () => {
    const scoreSystem = new ScoreSystem()
    const birdX = 200
    const pipe = new PipePair(birdX - PIPE_CONFIG.width + 5, 200)
    scoreSystem.update(birdX, [pipe])
    expect(scoreSystem.score).toBe(0)
  })
})
