import { IMAGE_KEYS } from '../assets'
import { FX } from '../fx'
import type { EnvironmentConfig, ParticleConfig } from './types'

const toParticleConfig = (config: {
  enabled: boolean
  frequency: number
  count: number
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
}): ParticleConfig => ({
  enabled: config.enabled,
  frequency: config.frequency,
  maxParticles: config.count,
  speedMin: config.speedMin,
  speedMax: config.speedMax,
  driftMin: config.driftMin,
  driftMax: config.driftMax,
  scaleMin: config.scaleMin,
  scaleMax: config.scaleMax,
  alphaMin: config.alphaMin,
  alphaMax: config.alphaMax,
  lifespanMin: config.lifespanMin,
  lifespanMax: config.lifespanMax,
})

export const EVIL_FOREST_V1: EnvironmentConfig = {
  key: 'v1',
  label: 'Evil Forest V1',
  assets: [],
  layers: [
    { key: IMAGE_KEYS.bgFar, name: 'Sky Far', speed: FX.parallax.far, depth: 0 },
    { key: IMAGE_KEYS.bgMid, name: 'Forest Mid', speed: FX.parallax.mid, depth: 0.35 },
    { key: IMAGE_KEYS.bgNear, name: 'Forest Near', speed: FX.parallax.near, depth: 0.7 },
  ],
  fogLayers: [
    {
      key: IMAGE_KEYS.fog,
      name: 'Fog',
      speed: 0.04,
      depth: 0.55,
      alpha: FX.fog.alpha,
      scale: 1,
      blendMode: 'normal',
    },
  ],
  particles: {
    embers: { ...toParticleConfig(FX.embers), blendMode: 'add' },
    dust: { ...toParticleConfig(FX.dust), blendMode: 'normal' },
    leaf: { ...toParticleConfig(FX.leaf), blendMode: 'normal' },
  },
}
