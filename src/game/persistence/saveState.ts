export const SAVE_STATE_VERSION = 2

export type SaveState = {
  version: 2
  createdAt: number
  updatedAt: number
  coins: number
  lifetime: {
    runs: number
    bestScore: number
    totalCoinsEarned: number
  }
  purchases: {
    removeAds: boolean
    supporterPack: boolean
  }
  inventory: {
    ownedSkins: string[]
    ownedTrails: string[]
    ownedFrames: string[]
    selected: {
      skin: string | null
      trail: string | null
      frame: string | null
    }
  }
  streak: {
    lastClaimDate: string | null
    streakCount: number
  }
}

export type MigrationResult = {
  state: SaveState
  migrated: boolean
}

export const createDefaultSaveState = (now: number): SaveState => ({
  version: SAVE_STATE_VERSION,
  createdAt: now,
  updatedAt: now,
  coins: 0,
  lifetime: {
    runs: 0,
    bestScore: 0,
    totalCoinsEarned: 0,
  },
  purchases: {
    removeAds: false,
    supporterPack: false,
  },
  inventory: {
    ownedSkins: [],
    ownedTrails: [],
    ownedFrames: [],
    selected: {
      skin: null,
      trail: null,
      frame: null,
    },
  },
  streak: {
    lastClaimDate: null,
    streakCount: 0,
  },
})

export const migrateSaveState = (input: unknown, now: number): MigrationResult => {
  if (!isRecord(input)) {
    return { state: createDefaultSaveState(now), migrated: true }
  }

  const version = readNumber(input.version, 0)
  if (version.value === SAVE_STATE_VERSION) {
    return normalizeV2(input, now)
  }

  if (version.value === 1) {
    const normalized = normalizeV2(input, now)
    return { state: normalized.state, migrated: true }
  }

  if (version.value === 0) {
    return { state: migrateV0(input, now), migrated: true }
  }

  return { state: createDefaultSaveState(now), migrated: true }
}

const normalizeV2 = (input: Record<string, unknown>, now: number): MigrationResult => {
  const base = createDefaultSaveState(now)
  let migrated = false

  const createdAt = readNumber(input.createdAt, base.createdAt)
  const updatedAt = readNumber(input.updatedAt, base.updatedAt)
  const coins = readNumber(input.coins, base.coins)
  if (!createdAt.valid || !updatedAt.valid || !coins.valid) {
    migrated = true
  }

  const lifetimeRecord = readRecord(input.lifetime)
  if (!lifetimeRecord.valid) {
    migrated = true
  }
  const runs = readNumber(lifetimeRecord.value.runs, base.lifetime.runs)
  const bestScore = readNumber(lifetimeRecord.value.bestScore, base.lifetime.bestScore)
  const totalCoins = readNumber(lifetimeRecord.value.totalCoinsEarned, base.lifetime.totalCoinsEarned)
  if (!runs.valid || !bestScore.valid || !totalCoins.valid) {
    migrated = true
  }

  const purchasesRecord = readRecord(input.purchases)
  if (!purchasesRecord.valid) {
    migrated = true
  }
  const removeAds = readBool(purchasesRecord.value.removeAds, base.purchases.removeAds)
  const supporterPack = readBool(
    purchasesRecord.value.supporterPack,
    base.purchases.supporterPack,
  )
  if (!removeAds.valid || !supporterPack.valid) {
    migrated = true
  }

  const inventoryRecord = readRecord(input.inventory)
  if (!inventoryRecord.valid) {
    migrated = true
  }
  const ownedSkins = readStringArray(inventoryRecord.value.ownedSkins, base.inventory.ownedSkins)
  const ownedTrails = readStringArray(inventoryRecord.value.ownedTrails, base.inventory.ownedTrails)
  const ownedFrames = readStringArray(inventoryRecord.value.ownedFrames, base.inventory.ownedFrames)
  if (!ownedSkins.valid || !ownedTrails.valid || !ownedFrames.valid) {
    migrated = true
  }

  const selectedRecord = readRecord(inventoryRecord.value.selected)
  if (!selectedRecord.valid) {
    migrated = true
  }
  const selectedSkin = readOptionalString(selectedRecord.value.skin, base.inventory.selected.skin)
  const selectedTrail = readOptionalString(selectedRecord.value.trail, base.inventory.selected.trail)
  const selectedFrame = readOptionalString(selectedRecord.value.frame, base.inventory.selected.frame)
  if (!selectedSkin.valid || !selectedTrail.valid || !selectedFrame.valid) {
    migrated = true
  }

  const streakRecord = readRecord(input.streak)
  if (!streakRecord.valid) {
    migrated = true
  }
  const lastClaimDate = readOptionalString(streakRecord.value.lastClaimDate, base.streak.lastClaimDate)
  const streakCount = readNumber(streakRecord.value.streakCount, base.streak.streakCount)
  if (!lastClaimDate.valid || !streakCount.valid) {
    migrated = true
  }

  const normalizedCreatedAt = createdAt.value
  const normalizedUpdatedAt = Math.max(updatedAt.value, normalizedCreatedAt)

  return {
    state: {
      version: SAVE_STATE_VERSION,
      createdAt: normalizedCreatedAt,
      updatedAt: normalizedUpdatedAt,
      coins: coins.value,
      lifetime: {
        runs: runs.value,
        bestScore: bestScore.value,
        totalCoinsEarned: totalCoins.value,
      },
      purchases: {
        removeAds: removeAds.value,
        supporterPack: supporterPack.value,
      },
      inventory: {
        ownedSkins: ownedSkins.value,
        ownedTrails: ownedTrails.value,
        ownedFrames: ownedFrames.value,
        selected: {
          skin: selectedSkin.value,
          trail: selectedTrail.value,
          frame: selectedFrame.value,
        },
      },
      streak: {
        lastClaimDate: lastClaimDate.value,
        streakCount: streakCount.value,
      },
    },
    migrated,
  }
}

const migrateV0 = (input: Record<string, unknown>, now: number): SaveState => {
  const base = createDefaultSaveState(now)
  const createdAt = readNumber(input.createdAt, base.createdAt)
  const updatedAt = readNumber(input.updatedAt, base.updatedAt)
  const coins = readNumber(input.coins, base.coins)
  const bestScore = readNumber(input.bestScore, base.lifetime.bestScore)
  const normalizedCreatedAt = createdAt.value
  const normalizedUpdatedAt = Math.max(updatedAt.value, normalizedCreatedAt)

  return {
    ...base,
    version: SAVE_STATE_VERSION,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
    coins: coins.value,
    lifetime: {
      ...base.lifetime,
      bestScore: bestScore.value,
    },
  }
}

type ReadResult<T> = {
  value: T
  valid: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'

const readRecord = (value: unknown): ReadResult<Record<string, unknown>> => {
  if (isRecord(value)) {
    return { value, valid: true }
  }
  return { value: {}, valid: false }
}

const readNumber = (value: unknown, fallback: number): ReadResult<number> => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, valid: true }
  }
  return { value: fallback, valid: false }
}

const readBool = (value: unknown, fallback: boolean): ReadResult<boolean> => {
  if (typeof value === 'boolean') {
    return { value, valid: true }
  }
  return { value: fallback, valid: false }
}

const readOptionalString = (value: unknown, fallback: string | null): ReadResult<string | null> => {
  if (typeof value === 'string' || value === null) {
    return { value, valid: true }
  }
  return { value: fallback, valid: false }
}

const readStringArray = (value: unknown, fallback: string[]): ReadResult<string[]> => {
  if (!Array.isArray(value)) {
    return { value: [...fallback], valid: false }
  }
  const filtered = value.filter((entry) => typeof entry === 'string')
  const valid = filtered.length === value.length
  return { value: filtered, valid }
}
