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
}
