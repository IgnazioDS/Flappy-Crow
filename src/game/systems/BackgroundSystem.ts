import Phaser from 'phaser'
import { GAME_DIMENSIONS, PIPE_CONFIG } from '../config'
import type {
  BiolumeConfig,
  EnvironmentConfig,
  EnvironmentFogLayer,
  EnvironmentLayer,
  LightRaysConfig,
  ReflectionConfig,
} from '../theme/env/types'

type LayerInstance = {
  sprite: Phaser.GameObjects.TileSprite
  speed: number
  name: string
  /** Vertical tile drift speed (fraction of world scroll speed). Fog only. */
  driftSpeed?: number
}

type BiolumeInstance = {
  sprite: Phaser.GameObjects.Image
  baseAlpha: number
  baseScale: number
  pulseSpeed: number
}

type LightRaysInstance = {
  sprite: Phaser.GameObjects.Image
  baseAlpha: number
  pulseSpeed: number
}

type ReflectionInstance = {
  sprite: Phaser.GameObjects.TileSprite
  speed: number
}

export class BackgroundSystem {
  private scene: Phaser.Scene
  private env: EnvironmentConfig
  private speedScale = 1
  private layers: LayerInstance[] = []
  private fogLayers: LayerInstance[] = []
  private foregroundLayers: LayerInstance[] = []
  private lightRays: LightRaysInstance | null = null
  private reflection: {
    container: Phaser.GameObjects.Container
    maskSprite: Phaser.GameObjects.Image
    layers: ReflectionInstance[]
    config: ReflectionConfig
  } | null = null
  private biolume: BiolumeInstance[] = []
  private elapsed = 0
  private reducedMotion = false
  private lowPower = false

  constructor(scene: Phaser.Scene, env: EnvironmentConfig) {
    this.scene = scene
    this.env = env
  }

  setEnvironment(env: EnvironmentConfig): void {
    this.destroy()
    this.env = env
    this.create()
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced
  }

  setLowPowerMode(enabled: boolean): void {
    this.lowPower = enabled
    this.applyLowPowerVisibility()
  }

  setSpeedScale(scale: number): void {
    this.speedScale = Math.max(0, scale)
  }

  create(): void {
    this.layers = this.env.layers.map((layer) => this.createLayer(layer))
    this.fogLayers = this.env.fogLayers.map((layer) => this.createFogLayer(layer))

    if (this.env.foregroundLayers) {
      this.foregroundLayers = this.env.foregroundLayers.map((layer) => this.createLayer(layer))
    }

    if (this.env.lightRays) {
      this.lightRays = this.createLightRays(this.env.lightRays)
    }

    if (this.env.reflection) {
      this.reflection = this.createReflection(this.env.reflection)
    }

    if (this.env.biolume) {
      this.biolume = this.createBiolume(this.env.biolume)
    }
    this.applyLowPowerVisibility()
  }

  update(dt: number): void {
    this.elapsed += dt

    if (!this.reducedMotion) {
      this.updateLayers(this.layers, dt)
      this.updateLayers(this.fogLayers, dt)
      this.updateLayers(this.foregroundLayers, dt)
    }

    if (this.lightRays && this.lightRays.sprite.visible) {
      this.updateLightRays(this.lightRays)
    }

    if (this.reflection && this.reflection.container.visible && !this.reducedMotion) {
      this.updateReflection(this.reflection, dt)
    }

    if (this.biolume.length > 0 && !this.reducedMotion) {
      this.updateBiolume(this.biolume)
    }
  }

  getDebugLines(): string[] {
    const format = (layer: LayerInstance) =>
      `${layer.name}: ${layer.speed.toFixed(2)}`
    const lines = [...this.layers.map(format)]
    if (this.fogLayers.length > 0) {
      lines.push(...this.fogLayers.map(format))
    }
    if (this.foregroundLayers.length > 0) {
      lines.push(...this.foregroundLayers.map(format))
    }
    return lines
  }

  destroy(): void {
    this.layers.forEach((layer) => layer.sprite.destroy())
    this.fogLayers.forEach((layer) => layer.sprite.destroy())
    this.foregroundLayers.forEach((layer) => layer.sprite.destroy())
    this.layers = []
    this.fogLayers = []
    this.foregroundLayers = []

    if (this.lightRays) {
      this.lightRays.sprite.destroy()
      this.lightRays = null
    }

    if (this.reflection) {
      this.reflection.layers.forEach((layer) => layer.sprite.destroy())
      this.reflection.container.destroy()
      this.reflection.maskSprite.destroy()
      this.reflection = null
    }

    if (this.biolume.length > 0) {
      this.biolume.forEach((patch) => patch.sprite.destroy())
      this.biolume = []
    }

    this.elapsed = 0
  }

  private createLayer(layer: EnvironmentLayer): LayerInstance {
    const sprite = this.scene.add
      .tileSprite(0, 0, GAME_DIMENSIONS.width, GAME_DIMENSIONS.height, layer.key)
      .setOrigin(0, 0)
      .setDepth(layer.depth)
    if (layer.alpha !== undefined) {
      sprite.setAlpha(layer.alpha)
    }
    if (layer.scale !== undefined) {
      sprite.tileScaleX = layer.scale
      sprite.tileScaleY = layer.scale
    }
    return { sprite, speed: layer.speed, name: layer.name }
  }

  private createFogLayer(layer: EnvironmentFogLayer): LayerInstance {
    const instance = this.createLayer(layer)
    if (layer.blendMode === 'add') {
      instance.sprite.setBlendMode(Phaser.BlendModes.ADD)
    } else if (layer.blendMode === 'screen') {
      instance.sprite.setBlendMode(Phaser.BlendModes.SCREEN)
    }
    if (layer.tint !== undefined) {
      instance.sprite.setTint(layer.tint)
    }
    instance.driftSpeed = layer.driftSpeed
    return instance
  }

  private updateLayers(layers: LayerInstance[], dt: number): void {
    if (layers.length === 0) {
      return
    }
    const baseSpeed = PIPE_CONFIG.speed * this.speedScale * dt
    for (const layer of layers) {
      if (!layer.sprite.visible) {
        continue
      }
      layer.sprite.tilePositionX += baseSpeed * layer.speed
      if (layer.driftSpeed !== undefined) {
        layer.sprite.tilePositionY += baseSpeed * layer.driftSpeed
      }
    }
  }

  private createLightRays(config: LightRaysConfig): LightRaysInstance {
    const sprite = this.scene.add
      .image(GAME_DIMENSIONS.width / 2, GAME_DIMENSIONS.height / 2, config.key)
      .setDepth(config.depth)
      .setAlpha(config.alpha)
    sprite.setDisplaySize(GAME_DIMENSIONS.width, GAME_DIMENSIONS.height)
    if (config.scale !== undefined) {
      sprite.setScale(config.scale)
    }
    if (config.blendMode === 'add') {
      sprite.setBlendMode(Phaser.BlendModes.ADD)
    } else if (config.blendMode === 'screen') {
      sprite.setBlendMode(Phaser.BlendModes.SCREEN)
    }
    return { sprite, baseAlpha: config.alpha, pulseSpeed: config.pulseSpeed }
  }

  private updateLightRays(instance: LightRaysInstance): void {
    if (this.reducedMotion) {
      instance.sprite.setAlpha(instance.baseAlpha)
      return
    }
    const pulse = (Math.sin(this.elapsed * instance.pulseSpeed) + 1) * 0.5
    instance.sprite.setAlpha(instance.baseAlpha * (0.75 + pulse * 0.25))
  }

  private createReflection(config: ReflectionConfig): {
    container: Phaser.GameObjects.Container
    maskSprite: Phaser.GameObjects.Image
    layers: ReflectionInstance[]
    config: ReflectionConfig
  } {
    const container = this.scene.add.container(0, 0).setDepth(config.depth)
    const layers: ReflectionInstance[] = config.layers.map((layer) => {
      const sprite = this.scene.add
        .tileSprite(0, config.waterlineY, GAME_DIMENSIONS.width, config.height, layer.key)
        .setOrigin(0, 0)
        .setAlpha(layer.alpha)
      sprite.setFlipY(true)
      container.add(sprite)
      return { sprite, speed: layer.speed }
    })

    const maskSprite = this.scene.add
      .image(0, 0, config.maskKey)
      .setOrigin(0, 0)
      .setVisible(false)
    maskSprite.setDisplaySize(GAME_DIMENSIONS.width, GAME_DIMENSIONS.height)
    const mask = new Phaser.Display.Masks.BitmapMask(this.scene, maskSprite)
    container.setMask(mask)

    return { container, maskSprite, layers, config }
  }

  private updateReflection(
    reflection: {
      container: Phaser.GameObjects.Container
      layers: ReflectionInstance[]
      config: ReflectionConfig
    },
    dt: number,
  ): void {
    const baseSpeed = PIPE_CONFIG.speed * this.speedScale * dt
    const ripple =
      this.reducedMotion ? 0 : Math.sin(this.elapsed * reflection.config.rippleSpeed) *
        reflection.config.rippleAmplitude
    for (const layer of reflection.layers) {
      layer.sprite.tilePositionX += baseSpeed * layer.speed
      layer.sprite.x = ripple
    }
  }

  private createBiolume(config: BiolumeConfig): BiolumeInstance[] {
    const patches: BiolumeInstance[] = []
    for (const patch of config.patches) {
      const sprite = this.scene.add
        .image(patch.x, patch.y, config.key)
        .setDepth(config.depth)
        .setAlpha(patch.alpha)
      sprite.setScale(patch.scale)
      if (config.blendMode === 'screen') {
        sprite.setBlendMode(Phaser.BlendModes.SCREEN)
      } else {
        sprite.setBlendMode(Phaser.BlendModes.ADD)
      }
      patches.push({
        sprite,
        baseAlpha: patch.alpha,
        baseScale: patch.scale,
        pulseSpeed: patch.pulseSpeed,
      })
    }
    return patches
  }

  private updateBiolume(patches: BiolumeInstance[]): void {
    if (this.reducedMotion) {
      for (const patch of patches) {
        if (!patch.sprite.visible) {
          continue
        }
        patch.sprite.setAlpha(patch.baseAlpha)
        patch.sprite.setScale(patch.baseScale)
      }
      return
    }
    for (const patch of patches) {
      if (!patch.sprite.visible) {
        continue
      }
      const pulse = (Math.sin(this.elapsed * patch.pulseSpeed) + 1) * 0.5
      patch.sprite.setAlpha(patch.baseAlpha * (0.75 + pulse * 0.25))
      patch.sprite.setScale(patch.baseScale * (0.95 + pulse * 0.05))
    }
  }

  private applyLowPowerVisibility(): void {
    const lowPowerConfig = this.env.lowPower
    const isLowPower = this.lowPower && lowPowerConfig
    const disabledLayers = new Set(lowPowerConfig?.disableLayers ?? [])

    for (const layer of this.layers) {
      layer.sprite.setVisible(!(isLowPower && disabledLayers.has(layer.name)))
    }
    for (const layer of this.fogLayers) {
      layer.sprite.setVisible(!(isLowPower && lowPowerConfig?.disableFog))
    }
    for (const layer of this.foregroundLayers) {
      layer.sprite.setVisible(!(isLowPower && lowPowerConfig?.disableForeground))
    }

    if (this.lightRays) {
      this.lightRays.sprite.setVisible(!(isLowPower && lowPowerConfig?.disableLightRays))
    }
    if (this.reflection) {
      this.reflection.container.setVisible(!(isLowPower && lowPowerConfig?.disableReflection))
    }
    if (this.biolume.length > 0) {
      const visible = !(isLowPower && lowPowerConfig?.disableBiolume)
      this.biolume.forEach((patch) => patch.sprite.setVisible(visible))
    }
  }
}
