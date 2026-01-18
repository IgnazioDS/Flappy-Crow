import Phaser from 'phaser'

export type ImpactBurstConfig = {
  enabled: boolean
  count: number
  speedMin: number
  speedMax: number
  scaleMin: number
  scaleMax: number
  alphaStart: number
  alphaEnd: number
  lifespanMin: number
  lifespanMax: number
  tint?: number
}

export type ImpactBurstVisual = {
  atlasKey?: string
  frame?: string
  blendMode?: Phaser.BlendModes
}

export class ImpactBurst {
  private scene: Phaser.Scene
  private config: ImpactBurstConfig
  private visual: ImpactBurstVisual
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private enabled: boolean

  constructor(scene: Phaser.Scene, config: ImpactBurstConfig, visual: ImpactBurstVisual) {
    this.scene = scene
    this.config = config
    this.visual = visual
    this.enabled = config.enabled
    this.createEmitter()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  burst(x: number, y: number): void {
    if (!this.enabled || !this.config.enabled) {
      return
    }
    if (this.emitter) {
      this.emitter.explode(this.config.count, x, y)
      return
    }

    const color = this.config.tint ?? 0xffffff
    const radius = Math.max(10, Math.round(18 * this.config.scaleMax))
    const circle = this.scene.add.circle(x, y, radius, color, this.config.alphaStart)
    circle.setDepth(4.2)
    this.scene.tweens.add({
      targets: circle,
      alpha: this.config.alphaEnd,
      scale: 1.4,
      duration: Math.max(this.config.lifespanMin, 220),
      ease: 'Sine.Out',
      onComplete: () => circle.destroy(),
    })
  }

  destroy(): void {
    if (this.emitter) {
      this.emitter.destroy()
      this.emitter = null
    }
  }

  private createEmitter(): void {
    if (!this.config.enabled || !this.visual.atlasKey || !this.visual.frame) {
      return
    }

    const emitter = this.scene.add.particles(0, 0, this.visual.atlasKey, {
      frame: this.visual.frame,
      quantity: this.config.count,
      lifespan: { min: this.config.lifespanMin, max: this.config.lifespanMax },
      speed: { min: this.config.speedMin, max: this.config.speedMax },
      scale: { min: this.config.scaleMin, max: this.config.scaleMax },
      alpha: { start: this.config.alphaStart, end: this.config.alphaEnd },
      blendMode: this.visual.blendMode ?? Phaser.BlendModes.ADD,
    })
    emitter.setDepth(4.2)
    emitter.setFrequency(-1)
    if (this.config.tint !== undefined) {
      emitter.setTint(this.config.tint)
    }
    this.emitter = emitter
  }
}
