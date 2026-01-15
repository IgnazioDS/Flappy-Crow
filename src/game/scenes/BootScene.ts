import Phaser from 'phaser'
import { getActiveTheme } from '../theme'
import { getEnvironmentAssets } from '../theme/env'

/**
 * Preloads visual assets before gameplay starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    const theme = getActiveTheme()
    const supportsWebp = this.supportsWebp()
    if (theme.assets.atlas) {
      const atlasImage = supportsWebp
        ? theme.assets.atlas.imageWebp ?? theme.assets.atlas.imagePng
        : theme.assets.atlas.imagePng
      this.load.atlas(theme.assets.atlas.key, atlasImage, theme.assets.atlas.data)
    }
    Object.entries(theme.assets.images).forEach(([key, path]) => {
      this.load.image(key, path)
    })
    if (theme.id === 'evil-forest') {
      getEnvironmentAssets().forEach((asset) => {
        const path = supportsWebp ? asset.pathWebp ?? asset.path : asset.path
        this.load.image(asset.key, path)
      })
    }
  }

  create(): void {
    this.scene.start('PlayScene')
  }

  private supportsWebp(): boolean {
    try {
      const canvas = document.createElement('canvas')
      if (!canvas.getContext) {
        return false
      }
      return canvas.toDataURL('image/webp').startsWith('data:image/webp')
    } catch {
      return false
    }
  }
}
