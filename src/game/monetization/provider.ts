import type { IapProduct } from './products'

export type IapPurchaseStatus = 'purchased' | 'cancelled' | 'failed' | 'not_supported'

export type IapPurchaseResult = {
  status: IapPurchaseStatus
  productId?: string
  transactionId?: string
  error?: string
}

export type IapProvider = {
  isAvailable: () => boolean
  purchase: (product: IapProduct) => Promise<IapPurchaseResult>
  restore: () => Promise<IapPurchaseResult[]>
}

export const createIapProvider = (): IapProvider => ({
  isAvailable: () => false,
  purchase: async () => ({
    status: 'not_supported',
  }),
  restore: async () => [],
})

// TODO: Replace createIapProvider implementation with a Capacitor IAP plugin provider.
