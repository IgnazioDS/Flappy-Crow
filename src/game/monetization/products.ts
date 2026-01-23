export type IapProductId = 'remove_ads' | 'supporter_pack'

export type IapProduct = {
  id: IapProductId
  storeId: string
  title: string
  subtitle?: string
  priceLabel: string
}

export const IAP_PRODUCTS: IapProduct[] = [
  {
    id: 'remove_ads',
    storeId: 'com.flappycrow.remove_ads',
    title: 'REMOVE ADS',
    subtitle: 'No ads in this build',
    priceLabel: '$1.99',
  },
  {
    id: 'supporter_pack',
    storeId: 'com.flappycrow.supporter_pack',
    title: 'SUPPORTER PACK',
    subtitle: 'Unlocks cosmetic bundle',
    priceLabel: '$3.99',
  },
]

export const SUPPORTER_PACK_ITEM_IDS = [
  'skin-ember',
  'skin-glacier',
  'frame-sunset',
  'frame-emerald',
]
