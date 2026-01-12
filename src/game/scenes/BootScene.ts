import Phaser from 'phaser'
import { THEME } from '../theme'

/**
 * Preloads visual assets before gameplay starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    Object.entries(THEME.assetPaths).forEach(([key, path]) => {
      this.load.image(key, path)
    })
  }

  create(): void {
    this.scene.start('PlayScene')
  }
}
