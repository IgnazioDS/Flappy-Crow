import type { ThemeDefinition, ThemeId } from './types'
import { classicTheme } from './themes/classic'
import { evilForestTheme } from './themes/evilForest'

const THEME_STORAGE_KEY = 'flappy-theme'
const DEFAULT_THEME_ID: ThemeId = 'evil-forest'

const THEMES: Record<ThemeId, ThemeDefinition> = {
  classic: classicTheme,
  'evil-forest': evilForestTheme,
}

const isThemeId = (value: string): value is ThemeId => value in THEMES

const readStoredThemeId = (): ThemeId | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw && isThemeId(raw)) {
      return raw
    }
  } catch {
    return null
  }
  return null
}

export const listThemes = (): ThemeDefinition[] => Object.values(THEMES)

export const getActiveThemeId = (): ThemeId => {
  const stored = readStoredThemeId()
  if (stored) {
    return stored
  }
  const env = import.meta.env.VITE_THEME
  if (env && isThemeId(env)) {
    return env
  }
  return DEFAULT_THEME_ID
}

export const setActiveThemeId = (themeId: ThemeId): void => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  } catch {
    // Ignore storage errors.
  }
}

export const getActiveTheme = (): ThemeDefinition => THEMES[getActiveThemeId()]

export type { ThemeDefinition, ThemeId } from './types'
