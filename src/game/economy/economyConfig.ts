export type RewardPolicy = {
  baseCoins: number
  coinsPerScore: number
  milestoneBonuses: Array<{
    score: number
    coins: number
  }>
}

export const ECONOMY_CONFIG: { rewardPolicy: RewardPolicy } = {
  rewardPolicy: {
    baseCoins: 1,
    coinsPerScore: 1,
    milestoneBonuses: [
      { score: 5, coins: 2 },
      { score: 10, coins: 3 },
      { score: 20, coins: 5 },
      { score: 30, coins: 8 },
    ],
  },
}
