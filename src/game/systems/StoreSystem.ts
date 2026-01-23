import type { CosmeticItem, StoreCatalog } from '../store/types'

export type PurchaseStatus =
  | 'purchased'
  | 'already_owned'
  | 'insufficient_funds'
  | 'not_found'

export type PurchaseResult = {
  status: PurchaseStatus
  item: CosmeticItem | null
  coinsRemaining: number
}

export class StoreSystem {
  private catalog: StoreCatalog

  constructor(catalog: StoreCatalog) {
    this.catalog = catalog
  }

  getItem(id: string): CosmeticItem | null {
    return this.catalog.items.find((item) => item.id === id) ?? null
  }

  purchase(
    id: string,
    coins: number,
    isOwned: (item: CosmeticItem) => boolean,
    unlock: (item: CosmeticItem) => void,
  ): PurchaseResult {
    const item = this.getItem(id)
    if (!item) {
      return { status: 'not_found', item: null, coinsRemaining: coins }
    }
    if (isOwned(item)) {
      return { status: 'already_owned', item, coinsRemaining: coins }
    }
    if (coins < item.price) {
      return { status: 'insufficient_funds', item, coinsRemaining: coins }
    }
    unlock(item)
    return { status: 'purchased', item, coinsRemaining: coins - item.price }
  }
}
