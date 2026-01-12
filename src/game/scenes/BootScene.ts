import Phaser from 'phaser'
import { ATLAS, IMAGE_PATHS } from '../theme'

/**
 * Preloads visual assets before gameplay starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    const atlasImage = this.supportsWebp() ? ATLAS.imageWebp : ATLAS.imagePng
    this.load.atlas(ATLAS.key, atlasImage, ATLAS.data)
    Object.entries(IMAGE_PATHS).forEach(([key, path]) => {
      this.load.image(key, path)
    })
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
