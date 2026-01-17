import Phaser from 'phaser'
import { BIRD_CONFIG } from '../config'
import { Bird } from '../entities/Bird'
import type { ThemeDefinition } from '../theme/types'
import type { ReplayData } from './types'

const FIXED_STEP_MS = 1000 / 60

export class ReplayPlayer {
  private scene: Phaser.Scene
  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image
  private bird: Bird
  private replay: ReplayData | null = null
  private elapsedMs = 0
  private flapIndex = 0
  private accumulatorMs = 0
  private active = false

  constructor(scene: Phaser.Scene, theme: ThemeDefinition) {
    this.scene = scene
    this.bird = new Bird(BIRD_CONFIG.startY)
    this.sprite = this.createGhostSprite(theme)
    this.sprite.setVisible(false)
  }

  start(replay: ReplayData): void {
    this.replay = replay
    this.elapsedMs = 0
    this.flapIndex = 0
    this.accumulatorMs = 0
    this.bird.reset(BIRD_CONFIG.startY)
    this.sprite.setPosition(this.bird.x, this.bird.y)
    this.sprite.setVisible(true)
    this.active = true
  }

  update(dtMs: number, groundY: number): void {
    if (!this.active || !this.replay) {
      return
    }

    this.accumulatorMs += dtMs
    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.step(FIXED_STEP_MS, groundY)
      this.accumulatorMs -= FIXED_STEP_MS
      if (!this.active) {
        break
      }
    }

    if (this.active) {
      this.updateSprite()
    }
  }

  stop(): void {
    this.active = false
    this.sprite.setVisible(false)
  }

  destroy(): void {
    this.sprite.destroy()
  }

  private step(stepMs: number, groundY: number): void {
    if (!this.replay) {
      return
    }
    this.elapsedMs += stepMs

    while (
      this.flapIndex < this.replay.flaps.length &&
      this.replay.flaps[this.flapIndex] <= this.elapsedMs
    ) {
      this.bird.flap()
      this.flapIndex += 1
    }

    this.bird.update(stepMs / 1000, groundY)

    if (this.elapsedMs >= this.replay.durationMs) {
      this.stop()
    }
  }

  private updateSprite(): void {
    this.sprite.setPosition(this.bird.x, this.bird.y)

    const range = BIRD_CONFIG.maxFallSpeed - BIRD_CONFIG.maxRiseSpeed
    const t = Phaser.Math.Clamp(
      (this.bird.velocity - BIRD_CONFIG.maxRiseSpeed) / range,
      0,
      1,
    )
    const rotation = Phaser.Math.Linear(BIRD_CONFIG.rotationUp, BIRD_CONFIG.rotationDown, t)
    this.sprite.setRotation(rotation)
  }

  private createGhostSprite(
    theme: ThemeDefinition,
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    const bird = theme.visuals.bird
    let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image

    if (bird.type === 'atlas') {
      const frame = bird.idleFrame ?? bird.flapFrames?.[0]
      sprite = this.scene.add.sprite(BIRD_CONFIG.x, BIRD_CONFIG.startY, bird.key, frame)
      sprite.setOrigin(0.45, 0.55)
    } else {
      sprite = this.scene.add.image(BIRD_CONFIG.x, BIRD_CONFIG.startY, bird.key)
      sprite.setOrigin(0.5, 0.5)
    }

    const birdScale = (BIRD_CONFIG.radius * 2) / sprite.height
    sprite.setScale(birdScale)
    sprite.setDepth(1.9)
    sprite.setAlpha(0.4)

    return sprite
  }
}
