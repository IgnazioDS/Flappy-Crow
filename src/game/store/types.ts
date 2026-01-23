export type CosmeticItemType = 'skin' | 'frame' | 'trail'

export type CosmeticItem = {
  id: string
  type: CosmeticItemType
  name: string
  price: number
  tint?: number
}

export type StoreCatalog = {
  items: CosmeticItem[]
}
