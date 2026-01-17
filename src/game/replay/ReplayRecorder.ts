import type { ReplayData, ReplaySeedMode } from './types'

type ReplayRecorderOptions = {
  seed: number | null
  seedLabel: string
  mode: ReplaySeedMode
}

export class ReplayRecorder {
  private flaps: number[] = []
  private startMs: number | null = null
  private seed: number | null
  private seedLabel: string
  private mode: ReplaySeedMode

  constructor(options: ReplayRecorderOptions) {
    this.seed = options.seed
    this.seedLabel = options.seedLabel
    this.mode = options.mode
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
      score,
      durationMs,
      flaps: [...this.flaps],
    }
  }
}
