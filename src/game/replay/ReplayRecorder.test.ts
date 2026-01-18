import { describe, expect, it } from 'vitest'
import { ReplayRecorder } from './ReplayRecorder'

describe('ReplayRecorder', () => {
  it('records relative flap times and metadata', () => {
    const recorder = new ReplayRecorder({
      seed: 123,
      seedLabel: 'seed-123',
      mode: 'custom',
      preset: 'hardcore',
    })

    recorder.start(1000)
    recorder.recordFlap(1000)
    recorder.recordFlap(1300)

    const replay = recorder.finish(1600, 5)
    expect(replay).not.toBeNull()
    expect(replay?.flaps).toEqual([0, 300])
    expect(replay?.durationMs).toBe(600)
    expect(replay?.seed).toBe(123)
    expect(replay?.seedLabel).toBe('seed-123')
    expect(replay?.mode).toBe('custom')
    expect(replay?.preset).toBe('hardcore')
    expect(replay?.score).toBe(5)
  })
})
