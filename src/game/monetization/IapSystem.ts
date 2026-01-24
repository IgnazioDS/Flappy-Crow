import { IAP_PRODUCTS, type IapProduct, type IapProductId } from './products'
import type { IapProvider } from './provider'

export type PurchaseResult = {
  status: 'purchased' | 'cancelled' | 'failed' | 'not_supported'
  product: IapProduct | null
}

export type RestoreResult = {
  status: 'restored' | 'none' | 'failed' | 'not_supported'
  restored: IapProductId[]
}

export class IapSystem {
  private provider: IapProvider

  constructor(provider: IapProvider) {
    this.provider = provider
  }

  isAvailable(): boolean {
    return this.provider.isAvailable()
  }

  listProducts(): IapProduct[] {
    return IAP_PRODUCTS
  }

  getProduct(id: IapProductId): IapProduct | null {
    return IAP_PRODUCTS.find((product) => product.id === id) ?? null
  }

  async purchase(id: IapProductId): Promise<PurchaseResult> {
    const product = this.getProduct(id)
    if (!product) {
      return { status: 'failed', product: null }
    }
    if (!this.provider.isAvailable()) {
      return { status: 'not_supported', product }
    }

    const result = await this.provider.purchase(product)
    if (result.status === 'purchased') {
      return { status: 'purchased', product }
    }
    if (result.status === 'cancelled') {
      return { status: 'cancelled', product }
    }
    if (result.status === 'not_supported') {
      return { status: 'not_supported', product }
    }
    return { status: 'failed', product }
  }

  async restore(): Promise<RestoreResult> {
    if (!this.provider.isAvailable()) {
      return { status: 'not_supported', restored: [] }
    }
    try {
      const results = await this.provider.restore()
      if (!results || results.length === 0) {
        return { status: 'none', restored: [] }
      }
      if (results.some((result) => result.status === 'failed')) {
        return { status: 'failed', restored: [] }
      }
      const restored: IapProductId[] = []
      for (const result of results) {
        if (result.status === 'purchased') {
          const product = IAP_PRODUCTS.find((item) => item.storeId === result.productId)
          if (product) {
            restored.push(product.id)
          }
        }
      }
      return {
        status: restored.length > 0 ? 'restored' : 'none',
        restored,
      }
    } catch {
      return { status: 'failed', restored: [] }
    }
  }
}
