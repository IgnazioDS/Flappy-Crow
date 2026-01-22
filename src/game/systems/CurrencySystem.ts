import type { RewardPolicy } from '../economy/economyConfig'

export class CurrencySystem {
  private policy: RewardPolicy

  constructor(policy: RewardPolicy) {
    this.policy = policy
  }

  calculateCoins(score: number): number {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0
    let bonus = 0
    for (const milestone of this.policy.milestoneBonuses) {
      if (safeScore >= milestone.score) {
        bonus += milestone.coins
      }
    }
    const earned =
      this.policy.baseCoins + safeScore * this.policy.coinsPerScore + bonus
    return Math.max(0, Math.floor(earned))
  }
}
