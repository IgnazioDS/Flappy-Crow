import { EVIL_FOREST_V1 } from './evilForestV1'
import { EVIL_FOREST_V2 } from './evilForestV2'
import type { EnvironmentAsset, EnvironmentConfig, EnvironmentKey } from './types'

export const ENVIRONMENTS: Record<EnvironmentKey, EnvironmentConfig> = {
  v1: EVIL_FOREST_V1,
  v2: EVIL_FOREST_V2,
}

export const DEFAULT_ENV: EnvironmentKey = 'v2'

export const getEnvironmentAssets = (): EnvironmentAsset[] => {
  return Object.values(ENVIRONMENTS).flatMap((env) => env.assets)
}

export type { EnvironmentAsset, EnvironmentConfig, EnvironmentKey }
