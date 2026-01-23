import type { CosmeticItem, CosmeticItemType, StoreCatalog } from './types'

export const STORE_CATALOG: StoreCatalog = {
  items: [
    {
      id: 'skin-classic',
      type: 'skin',
      name: 'Classic',
      price: 0,
    },
    {
      id: 'skin-ember',
      type: 'skin',
      name: 'Ember',
      price: 80,
      tint: 0xffb06a,
    },
    {
      id: 'skin-glacier',
      type: 'skin',
      name: 'Glacier',
      price: 110,
      tint: 0x7cc7ff,
    },
    {
      id: 'frame-default',
      type: 'frame',
      name: 'Default',
      price: 0,
    },
    {
      id: 'frame-sunset',
      type: 'frame',
      name: 'Sunset',
      price: 90,
      tint: 0xf4b65f,
    },
    {
      id: 'frame-emerald',
      type: 'frame',
      name: 'Emerald',
      price: 120,
      tint: 0x7ce5b4,
    },
  ],
}

export const DEFAULT_OWNED = {
  skins: ['skin-classic'],
  frames: ['frame-default'],
  trails: [] as string[],
}

export const DEFAULT_SELECTED = {
  skin: 'skin-classic',
  frame: 'frame-default',
  trail: null,
}

export const getItemById = (catalog: StoreCatalog, id: string): CosmeticItem | null =>
  catalog.items.find((item) => item.id === id) ?? null

export const getItemsByType = (
  catalog: StoreCatalog,
  type: CosmeticItemType,
): CosmeticItem[] => catalog.items.filter((item) => item.type === type)
