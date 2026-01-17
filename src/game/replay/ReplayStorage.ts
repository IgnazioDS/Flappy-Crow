import type { ReplayData } from './types'

const BEST_REPLAY_KEY = 'flappy-replay-best'
const MAX_FLAPS = 5000

const isReplayData = (value: unknown): value is ReplayData => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const replay = value as ReplayData
  if (replay.version !== 1) {
    return false
  }
  if (typeof replay.createdAt !== 'number' || !Number.isFinite(replay.createdAt)) {
    return false
  }
  if (replay.seed !== null && (typeof replay.seed !== 'number' || !Number.isFinite(replay.seed))) {
    return false
  }
  if (typeof replay.seedLabel !== 'string') {
    return false
  }
  if (replay.mode !== 'normal' && replay.mode !== 'daily' && replay.mode !== 'custom') {
    return false
  }
  if (typeof replay.score !== 'number' || !Number.isFinite(replay.score)) {
    return false
  }
  if (typeof replay.durationMs !== 'number' || !Number.isFinite(replay.durationMs)) {
    return false
  }
  if (!Array.isArray(replay.flaps) || replay.flaps.length > MAX_FLAPS) {
    return false
  }
  for (const flap of replay.flaps) {
    if (typeof flap !== 'number' || !Number.isFinite(flap)) {
      return false
    }
  }
  return true
}

export const loadBestReplay = (): ReplayData | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(BEST_REPLAY_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    return isReplayData(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const saveBestReplay = (replay: ReplayData): void => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(BEST_REPLAY_KEY, JSON.stringify(replay))
  } catch {
    // Ignore storage errors.
  }
}
