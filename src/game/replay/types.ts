export type ReplaySeedMode = 'normal' | 'daily' | 'custom'

export type ReplayData = {
  version: 1
  createdAt: number
  seed: number | null
  seedLabel: string
  mode: ReplaySeedMode
  score: number
  durationMs: number
  flaps: number[]
}
