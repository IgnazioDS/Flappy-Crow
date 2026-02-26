export type EnvironmentKey = 'v1' | 'v2'

export type EnvironmentAsset = {
  key: string
  path: string
  pathWebp?: string
}

export type EnvironmentLayer = {
  key: string
  name: string
  speed: number
  depth: number
  alpha?: number
  scale?: number
}

export type EnvironmentFogLayer = EnvironmentLayer & {
  blendMode?: 'normal' | 'screen' | 'add'
  /** Hex tint applied to the fog TileSprite (e.g. 0xb4c4d8 for blue-gray). */
  tint?: number
  /** Vertical drift speed as a fraction of world scroll speed. Creates slow up/down oscillation. */
  driftSpeed?: number
}

export type EnvironmentLowPowerConfig = {
  disableFog?: boolean
  disableForeground?: boolean
  disableLightRays?: boolean
  disableReflection?: boolean
  disableBiolume?: boolean
  disableLayers?: string[]
}

export type LightRaysConfig = {
  key: string
  depth: number
  alpha: number
  pulseSpeed: number
  scale?: number
  blendMode?: 'screen' | 'add'
}

export type ReflectionLayer = {
  key: string
  speed: number
  alpha: number
}

export type ReflectionConfig = {
  maskKey: string
  depth: number
  waterlineY: number
  height: number
  rippleSpeed: number
  rippleAmplitude: number
  layers: ReflectionLayer[]
}

export type BiolumePatch = {
  x: number
  y: number
  scale: number
  alpha: number
  pulseSpeed: number
}

export type BiolumeConfig = {
  key: string
  depth: number
  patches: BiolumePatch[]
  blendMode?: 'add' | 'screen'
  /**
   * Total maximum sparkle particles across all biolume patches (default: 14).
   * Hard cap shared across all patch emitters. Must be ≤ 18 per spec.
   */
  sparkleMax?: number
  /**
   * Milliseconds between sparkle particle spawns per patch emitter (default: 800).
   * Higher = sparser, lower = denser. Keep ≥ 500 to stay budget-friendly.
   */
  sparkleSpawnRate?: number
}

export type ParticleConfig = {
  enabled: boolean
  frequency: number
  maxParticles: number
  speedMin: number
  speedMax: number
  driftMin: number
  driftMax: number
  scaleMin: number
  scaleMax: number
  alphaMin: number
  alphaMax: number
  lifespanMin: number
  lifespanMax: number
  tint?: number
  blendMode?: 'normal' | 'add'
  areas?: Array<{ x: number; y: number; width: number; height: number }>
}

export type EnvironmentParticles = {
  embers?: ParticleConfig
  dust?: ParticleConfig
  leaf?: ParticleConfig
  fireflies?: ParticleConfig
}

/**
 * Full-screen cinematic grade overlay (programmatic canvas texture).
 * Adds a cool blue-purple tint + edge-darkening contrast to the entire scene,
 * rendered at `depth` just below the HUD scrim (3.95).
 */
export type GradeConfig = {
  /** Render depth — above gameplay (>2), below HUD scrim (3.95). Default: 3.50 */
  depth: number
  /** Sprite alpha (0–1). Controls how strongly the grade tints the scene. */
  alpha: number
}

/**
 * Tileable film-grain TileSprite (programmatic noise canvas texture).
 * Adds subtle texture noise over the entire scene.
 */
export type GrainConfig = {
  /** Render depth — just above grade overlay. Default: 3.51 */
  depth: number
  /** Sprite alpha (0–1). Keep very low (0.03–0.07) for subtlety. */
  alpha: number
  /** Horizontal scroll speed in px/s to animate the grain pattern (default: 55). */
  scrollSpeed?: number
}

/**
 * Cheap water shimmer/specular overlay using a tileable TileSprite.
 * Renders specular streak highlights over the swamp/water region,
 * masked by the existing water_reflection_mask to stay within channels.
 */
export type WaterShimmerConfig = {
  /** Whether the shimmer is active (allows runtime toggling without removing config). */
  enabled: boolean
  /** Render depth — above swamp_near (0.66), below foreground branches (0.84). */
  depth: number
  /** Base sprite alpha (0–1). Shimmer is barely noticeable at 0.05–0.12. */
  alpha: number
  /** Horizontal tile scroll speed in px/s. Creates moving specular feel. */
  scrollX: number
  /** Vertical tile scroll speed in px/s. Adds gentle perpendicular drift. */
  scrollY: number
  /**
   * Pulse amplitude as fraction of alpha (0–1).
   * 0 = constant alpha, 1 = pulse from 0 to alpha.
   * Keep ≤ 0.40 to avoid distracting flicker.
   */
  pulseAmp: number
  /** Alpha pulse frequency in cycles/second. Keep ≤ 0.40 for languid shimmer. */
  pulseHz: number
}

/**
 * Foreground separation: a slightly-larger, tinted, semi-transparent sprite
 * rendered *behind* the crow and gate sprites to create a soft rim/outline.
 * Only applied for themes that define this config (evil-forest V2).
 */
export type OutlineConfig = {
  /** Alpha of the behind-sprite (0–1). Range: 0.35–0.55. */
  alpha: number
  /** Scale multiplier vs. the main sprite (1.06–1.10). */
  scale: number
  /** Optional hex tint applied to the outline sprite (e.g. 0x4a8494 for dark teal). */
  tint?: number
}

export type EnvironmentConfig = {
  key: EnvironmentKey
  label: string
  assets: EnvironmentAsset[]
  layers: EnvironmentLayer[]
  fogLayers: EnvironmentFogLayer[]
  foregroundLayers?: EnvironmentLayer[]
  lightRays?: LightRaysConfig
  reflection?: ReflectionConfig
  biolume?: BiolumeConfig
  particles: EnvironmentParticles
  lowPower?: EnvironmentLowPowerConfig
  /** Cinematic grade overlay — cool tint + edge darkening over the full scene. */
  grade?: GradeConfig
  /** Film grain TileSprite — slow-scrolling noise for texture depth. */
  grain?: GrainConfig
  /** Foreground separation config for crow + gate rim sprites. */
  outline?: OutlineConfig
  /** Cheap water shimmer specular overlay for the swamp/water region. */
  waterShimmer?: WaterShimmerConfig
}
