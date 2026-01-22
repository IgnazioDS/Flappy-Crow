import { createDefaultSaveState, migrateSaveState, type SaveState } from './saveState'

export const SAVE_STATE_KEY = 'flappy-save'

export type StorageAdapter = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type LoadResult = {
  state: SaveState
  migrated: boolean
}

export type SaveSystemOptions = {
  storage?: StorageAdapter | null
  now?: () => number
}

export const loadSaveState = (
  storage: StorageAdapter | null,
  now: () => number = Date.now,
): LoadResult => {
  const fallback = createDefaultSaveState(now())
  if (!storage) {
    return { state: fallback, migrated: false }
  }
  const raw = safeGet(storage, SAVE_STATE_KEY)
  if (!raw) {
    return { state: fallback, migrated: true }
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    return migrateSaveState(parsed, now())
  } catch {
    return { state: fallback, migrated: true }
  }
}

export const writeSaveState = (storage: StorageAdapter | null, state: SaveState): void => {
  if (!storage) {
    return
  }
  safeSet(storage, SAVE_STATE_KEY, JSON.stringify(state))
}

export class SaveSystem {
  private storage: StorageAdapter | null
  private now: () => number
  private state: SaveState

  constructor(options: SaveSystemOptions = {}) {
    this.storage = resolveStorage(options.storage)
    this.now = options.now ?? Date.now
    const loadResult = loadSaveState(this.storage, this.now)
    this.state = loadResult.state
    if (loadResult.migrated) {
      writeSaveState(this.storage, this.state)
    }
  }

  getState(): SaveState {
    return this.state
  }

  update(updater: (state: SaveState) => SaveState): SaveState {
    const next = updater(this.state)
    this.state = { ...next, updatedAt: this.now() }
    writeSaveState(this.storage, this.state)
    return this.state
  }

  save(): void {
    this.state = { ...this.state, updatedAt: this.now() }
    writeSaveState(this.storage, this.state)
  }

  reset(): SaveState {
    const next = createDefaultSaveState(this.now())
    this.state = next
    writeSaveState(this.storage, this.state)
    return this.state
  }
}

const resolveStorage = (storage: StorageAdapter | null | undefined): StorageAdapter | null => {
  if (storage) {
    return storage
  }
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage
}

const safeGet = (storage: StorageAdapter, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (storage: StorageAdapter, key: string, value: string): void => {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage errors.
  }
}
