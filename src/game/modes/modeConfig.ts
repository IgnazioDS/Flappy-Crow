export type GameModeId = 'standard' | 'casual' | 'hardcore'

export type GameModeTuning = {
  speedMultiplier: number
  gapMultiplier: number
  maxSpeedScale?: number
  speedScalePerScore?: number
  minGap?: number
  gapReductionPerScore?: number
}

export type GameModeConfig = {
  id: GameModeId
  label: string
  tuning: GameModeTuning
}

export const DEFAULT_GAME_MODE: GameModeId = 'standard'

const GAME_MODES: GameModeConfig[] = [
  {
    id: 'standard',
    label: 'STANDARD',
    tuning: {
      speedMultiplier: 1,
      gapMultiplier: 1,
    },
  },
  {
    id: 'casual',
    label: 'CASUAL',
    tuning: {
      speedMultiplier: 0.9,
      gapMultiplier: 1.15,
      maxSpeedScale: 1.15,
      speedScalePerScore: 0.01,
      minGap: 125,
      gapReductionPerScore: 0.9,
    },
  },
  {
    id: 'hardcore',
    label: 'HARDCORE',
    tuning: {
      speedMultiplier: 1.08,
      gapMultiplier: 0.9,
      maxSpeedScale: 1.5,
      speedScalePerScore: 0.015,
      minGap: 95,
      gapReductionPerScore: 1.6,
    },
  },
]

const GAME_MODE_MAP: Record<GameModeId, GameModeConfig> = {
  standard: GAME_MODES[0],
  casual: GAME_MODES[1],
  hardcore: GAME_MODES[2],
}

export const listGameModes = (): GameModeConfig[] => [...GAME_MODES]

export const isGameModeId = (value: string): value is GameModeId => value in GAME_MODE_MAP

export const normalizeGameModeId = (value: string | null | undefined): GameModeId =>
  value && isGameModeId(value) ? value : DEFAULT_GAME_MODE

export const getGameModeConfig = (id: GameModeId): GameModeConfig => GAME_MODE_MAP[id]

export const getNextGameModeId = (current: GameModeId): GameModeId => {
  const index = GAME_MODES.findIndex((mode) => mode.id === current)
  const next = index === -1 ? 0 : (index + 1) % GAME_MODES.length
  return GAME_MODES[next].id
}
