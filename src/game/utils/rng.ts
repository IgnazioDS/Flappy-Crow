export interface RandomSource {
  next: () => number
}

export class SeededRng implements RandomSource {
  private state: number

  constructor(seed = 123456789) {
    this.state = seed >>> 0
  }

  next(): number {
    // LCG constants from Numerical Recipes
    this.state = (1664525 * this.state + 1013904223) >>> 0
    return this.state / 0xffffffff
  }
}

export const defaultRng: RandomSource = {
  next: () => Math.random(),
}

export const createSeededRngFromEnv = (): RandomSource => {
  return createSeededRngFromEnvOverride(null)
}

export const createSeededRngFromEnvOverride = (overrideSeed: number | null): RandomSource => {
  if (overrideSeed !== null) {
    return new SeededRng(overrideSeed)
  }
  const env = import.meta.env.VITE_TEST_SEED
  if (!env) {
    return defaultRng
  }
  const seed = Number(env)
  if (!Number.isFinite(seed)) {
    return defaultRng
  }
  return new SeededRng(seed)
}

export const seedFromString = (value: string): number => {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return Math.floor(parsed) >>> 0
  }
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const getDailySeed = (): { seed: number; label: string } => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const label = `${year}-${month}-${day}`
  const seed = Number(`${year}${month}${day}`)
  return { seed, label }
}

export const randomRange = (rng: RandomSource, min: number, max: number): number => {
  return min + rng.next() * (max - min)
}
