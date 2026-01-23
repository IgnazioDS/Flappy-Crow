import { describe, expect, it } from 'vitest'
import { StoreSystem } from './StoreSystem'
import { InventorySystem } from './InventorySystem'
import type { SaveState } from '../persistence/saveState'
import type { StoreCatalog } from '../store/types'

const createInventory = (): InventorySystem => {
  const inventory: SaveState['inventory'] = {
    ownedSkins: [],
    ownedTrails: [],
    ownedFrames: [],
    selected: {
      skin: null,
      trail: null,
      frame: null,
    },
  }
  return new InventorySystem(inventory)
}

describe('StoreSystem purchase flow', () => {
  const catalog: StoreCatalog = {
    items: [
      { id: 'skin-test', type: 'skin', name: 'Test', price: 50 },
      { id: 'frame-test', type: 'frame', name: 'Frame', price: 10 },
    ],
  }

  it('purchases and unlocks when funds are sufficient', () => {
    const inventory = createInventory()
    const store = new StoreSystem(catalog)
    const result = store.purchase(
      'skin-test',
      80,
      (item) => inventory.isOwned(item),
      (item) => {
        inventory.unlock(item)
      },
    )

    expect(result.status).toBe('purchased')
    expect(result.coinsRemaining).toBe(30)
    expect(result.item?.id).toBe('skin-test')
    expect(inventory.isOwned({ id: 'skin-test', type: 'skin', name: 'Test', price: 50 })).toBe(true)
  })

  it('blocks purchase when funds are insufficient', () => {
    const inventory = createInventory()
    const store = new StoreSystem(catalog)
    const result = store.purchase(
      'frame-test',
      5,
      (item) => inventory.isOwned(item),
      (item) => {
        inventory.unlock(item)
      },
    )

    expect(result.status).toBe('insufficient_funds')
    expect(result.coinsRemaining).toBe(5)
    expect(inventory.isOwned({ id: 'frame-test', type: 'frame', name: 'Frame', price: 10 })).toBe(
      false,
    )
  })
})
