import { describe, expect, it } from 'vitest'
import { SAVE_STATE_KEY, loadSaveState } from './SaveSystem'
import { createDefaultSaveState, SAVE_STATE_VERSION } from './saveState'

const createMemoryStorage = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

describe('SaveSystem migrations', () => {
  it('migrates legacy v0 saves', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      SAVE_STATE_KEY,
      JSON.stringify({
        version: 0,
        bestScore: 14,
        coins: 32,
        createdAt: 100,
        updatedAt: 120,
      }),
    )

    const result = loadSaveState(storage, () => 200)
    expect(result.migrated).toBe(true)
    expect(result.state.version).toBe(SAVE_STATE_VERSION)
    expect(result.state.coins).toBe(32)
    expect(result.state.lifetime.bestScore).toBe(14)
    expect(result.state.createdAt).toBe(100)
  })

  it('falls back when JSON is invalid', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_STATE_KEY, '{not json')

    const result = loadSaveState(storage, () => 500)
    expect(result.migrated).toBe(true)
    expect(result.state.version).toBe(SAVE_STATE_VERSION)
    expect(result.state.coins).toBe(0)
  })

  it('migrates v1 saves to the latest version', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      SAVE_STATE_KEY,
      JSON.stringify({
        version: 1,
        createdAt: 100,
        updatedAt: 120,
        coins: 5,
        lifetime: { runs: 1, bestScore: 4, totalCoinsEarned: 5 },
        inventory: {
          ownedSkins: [],
          ownedTrails: [],
          ownedFrames: [],
          selected: { skin: null, trail: null, frame: null },
        },
        streak: { lastClaimDate: null, streakCount: 0 },
      }),
    )

    const result = loadSaveState(storage, () => 1500)
    expect(result.migrated).toBe(true)
    expect(result.state.version).toBe(SAVE_STATE_VERSION)
    expect(result.state.purchases.removeAds).toBe(false)
  })

  it('keeps latest saves without migration', () => {
    const storage = createMemoryStorage()
    const base = createDefaultSaveState(1000)
    storage.setItem(SAVE_STATE_KEY, JSON.stringify(base))

    const result = loadSaveState(storage, () => 1500)
    expect(result.migrated).toBe(false)
    expect(result.state.version).toBe(SAVE_STATE_VERSION)
  })
})
