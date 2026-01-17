import type { GameModeId } from '../modes/modeConfig'
import type { ReplayData, ReplaySeedMode } from './types'

type ReplayRecorderOptions = {
  seed: number | null
  seedLabel: string
  mode: ReplaySeedMode
  preset: GameModeId
}

export class ReplayRecorder {
  private flaps: number[] = []
  private startMs: number | null = null
  private seed: number | null
  private seedLabel: string
  private mode: ReplaySeedMode
  private preset: GameModeId

  constructor(options: ReplayRecorderOptions) {
    this.seed = options.seed
    this.seedLabel = options.seedLabel
    this.mode = options.mode
    this.preset = options.preset
  }

  start(nowMs: number): void {
    this.startMs = nowMs
    this.flaps = []
  }

  recordFlap(nowMs: number): void {
    if (this.startMs === null) {
      return
    }
    const relative = Math.max(0, Math.round(nowMs - this.startMs))
    this.flaps.push(relative)
  }

  finish(nowMs: number, score: number): ReplayData | null {
    if (this.startMs === null) {
      return null
    }
    const durationMs = Math.max(0, Math.round(nowMs - this.startMs))
    return {
      version: 1,
      createdAt: Date.now(),
      seed: this.seed,
      seedLabel: this.seedLabel,
      mode: this.mode,
      preset: this.preset,
      score,
      durationMs,
      flaps: [...this.flaps],
    }
  }
}
