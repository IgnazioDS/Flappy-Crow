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

export const randomRange = (rng: RandomSource, min: number, max: number): number => {
  return min + rng.next() * (max - min)
}
