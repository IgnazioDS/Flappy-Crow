import { IAP_PRODUCTS, type IapProduct } from './products'

type CdvPurchaseGlobal = {
  store: CdvPurchaseStore
  Platform: {
    APPLE_APPSTORE: string
    TEST?: string
  }
  ProductType: {
    NON_CONSUMABLE: string
  }
  ErrorCode?: {
    PAYMENT_CANCELLED?: number
  }
}

type CdvPurchaseStore = {
  register: (products: unknown) => void
  initialize: (platforms?: unknown[]) => Promise<unknown>
  update: () => Promise<void>
  get: (productId: string) => CdvPurchaseProduct | undefined
  owned: (productId: string) => boolean
  restorePurchases: () => Promise<CdvPurchaseError | undefined>
  when: () => {
    approved: (callback: (transaction: CdvPurchaseTransaction) => void) => unknown
  }
}

type CdvPurchaseProduct = {
  id: string
  order?: () => Promise<CdvPurchaseError | undefined>
  getOffer?: () => { order: () => Promise<CdvPurchaseError | undefined> } | undefined
}

type CdvPurchaseTransaction = {
  finish: () => void
}

type CdvPurchaseError = {
  code?: number
  message?: string
}

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

export const createIapProvider = (): IapProvider => {
  let initPromise: Promise<boolean> | null = null
  let initialized = false

  const getCdvPurchase = (): CdvPurchaseGlobal | null => {
    if (typeof window === 'undefined') {
      return null
    }
    const purchase = (window as Window & { CdvPurchase?: CdvPurchaseGlobal }).CdvPurchase
    return purchase ?? null
  }

  const ensureInitialized = async (): Promise<boolean> => {
    if (initialized) {
      return true
    }
    if (initPromise) {
      return initPromise
    }
    initPromise = (async () => {
      const purchase = getCdvPurchase()
      if (!purchase) {
        return false
      }
      const store = purchase.store
      const platform = purchase.Platform?.APPLE_APPSTORE
      const productType = purchase.ProductType?.NON_CONSUMABLE
      if (!store || !platform || !productType) {
        return false
      }

      const products = IAP_PRODUCTS.map((product) => ({
        id: product.storeId,
        type: productType,
        platform,
      }))

      store.register(products)
      store.when().approved((transaction) => {
        try {
          transaction.finish()
        } catch {
          // Ignore finish errors; purchase may already be closed.
        }
      })

      try {
        await store.initialize([{ platform, options: { needAppReceipt: true } }])
        await store.update()
      } catch {
        return false
      }

      initialized = true
      return true
    })()
    return initPromise
  }

  return {
    isAvailable: () => {
      const purchase = getCdvPurchase()
      return Boolean(purchase?.store && purchase?.Platform?.APPLE_APPSTORE)
    },
    purchase: async (product) => {
      const purchase = getCdvPurchase()
      if (!purchase) {
        return { status: 'not_supported' }
      }
      const ok = await ensureInitialized()
      if (!ok) {
        return { status: 'not_supported' }
      }
      const store = purchase.store
      const productId = product.storeId
      let storeProduct = store.get(productId)
      if (!storeProduct) {
        try {
          await store.update()
        } catch {
          // Ignore update errors.
        }
        storeProduct = store.get(productId)
      }
      if (!storeProduct) {
        return { status: 'failed', productId, error: 'product_not_loaded' }
      }

      const order = storeProduct.order ?? storeProduct.getOffer?.()?.order
      if (!order) {
        return { status: 'failed', productId, error: 'offer_not_available' }
      }

      const error = await order()
      if (error) {
        const cancelled =
          purchase.ErrorCode?.PAYMENT_CANCELLED !== undefined &&
          error.code === purchase.ErrorCode.PAYMENT_CANCELLED
        return {
          status: cancelled ? 'cancelled' : 'failed',
          productId,
          error: error.message,
        }
      }
      return { status: 'purchased', productId }
    },
    restore: async () => {
      const purchase = getCdvPurchase()
      if (!purchase) {
        return [{ status: 'not_supported' }]
      }
      const ok = await ensureInitialized()
      if (!ok) {
        return [{ status: 'not_supported' }]
      }
      const store = purchase.store
      const error = await store.restorePurchases()
      if (error) {
        return [{ status: 'failed', error: error.message }]
      }
      try {
        await store.update()
      } catch {
        // Ignore update errors.
      }
      const owned = IAP_PRODUCTS.map((product) => product.storeId).filter((id) => store.owned(id))
      return owned.map((id) => ({ status: 'purchased', productId: id }))
    },
  }
}
