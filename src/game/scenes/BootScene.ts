import Phaser from 'phaser'
import { ASSETS } from '../config'

/**
 * Preloads visual assets before gameplay starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    this.load.image(ASSETS.background, 'assets/background.svg')
    this.load.image(ASSETS.bird, 'assets/bird.svg')
    this.load.image(ASSETS.pipe, 'assets/pipe.svg')
    this.load.image(ASSETS.ground, 'assets/ground.svg')
  }

  create(): void {
    this.scene.start('PlayScene')
  }
}
