import Phaser from 'phaser'
import { GAME_DIMENSIONS } from '../config'

export type ScreenFlashConfig = {
  enabled: boolean
  color: number
  alpha: number
  durationMs: number
}

export class ScreenFlash {
  private scene: Phaser.Scene
  private config: ScreenFlashConfig
  private rect: Phaser.GameObjects.Rectangle
  private tween: Phaser.Tweens.Tween | null = null
  private enabled: boolean

  constructor(scene: Phaser.Scene, config: ScreenFlashConfig) {
    this.scene = scene
    this.config = config
    this.enabled = config.enabled
    this.rect = scene.add
      .rectangle(0, 0, GAME_DIMENSIONS.width, GAME_DIMENSIONS.height, config.color, 0)
      .setOrigin(0, 0)
      .setDepth(6.5)
      .setVisible(false)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.rect.setVisible(false)
      this.rect.setAlpha(0)
      this.tween?.stop()
    }
  }

  flash(intensity = 1): void {
    if (!this.enabled || !this.config.enabled) {
      return
    }
    const alpha = Phaser.Math.Clamp(this.config.alpha * intensity, 0, 1)
    this.tween?.stop()
    this.rect.setVisible(true)
    this.rect.setFillStyle(this.config.color, alpha)
    this.rect.setAlpha(alpha)

    this.tween = this.scene.tweens.add({
      targets: this.rect,
      alpha: 0,
      duration: this.config.durationMs,
      ease: 'Sine.Out',
      onComplete: () => {
        this.rect.setVisible(false)
      },
    })
  }

  destroy(): void {
    this.tween?.stop()
    this.rect.destroy()
  }
}
