import { readStoredNumber, readStoredString, storeNumber, storeString } from '../persistence/storage'
import type { ThemeDefinition, ThemeTextStyle, ThemeUI } from '../theme/types'

export type Handedness = 'normal' | 'left' | 'right'
export type ContrastMode = 'normal' | 'high'

export type AccessibilitySettings = {
  hand: Handedness
  contrast: ContrastMode
  textScale: number
}

const HAND_KEY = 'flappy-hand'
const CONTRAST_KEY = 'flappy-contrast'
const TEXT_SCALE_KEY = 'flappy-text-scale'

const TEXT_SCALES = [1, 1.15, 1.3]
const HAND_OPTIONS: Handedness[] = ['normal', 'left', 'right']
const CONTRAST_OPTIONS: ContrastMode[] = ['normal', 'high']

export const readAccessibilitySettings = (): AccessibilitySettings => {
  const handRaw = readStoredString(HAND_KEY)
  const contrastRaw = readStoredString(CONTRAST_KEY)
  const scaleRaw = readStoredNumber(TEXT_SCALE_KEY, 1)

  return {
    hand: isHandedness(handRaw) ? handRaw : 'normal',
    contrast: isContrastMode(contrastRaw) ? contrastRaw : 'normal',
    textScale: TEXT_SCALES.includes(scaleRaw) ? scaleRaw : 1,
  }
}

export const getNextTextScale = (current: number): number => {
  const index = TEXT_SCALES.indexOf(current)
  const next = index === -1 ? 0 : (index + 1) % TEXT_SCALES.length
  return TEXT_SCALES[next]
}

export const getNextHandedness = (current: Handedness): Handedness => {
  const index = HAND_OPTIONS.indexOf(current)
  const next = index === -1 ? 0 : (index + 1) % HAND_OPTIONS.length
  return HAND_OPTIONS[next]
}

export const getNextContrastMode = (current: ContrastMode): ContrastMode => {
  const index = CONTRAST_OPTIONS.indexOf(current)
  const next = index === -1 ? 0 : (index + 1) % CONTRAST_OPTIONS.length
  return CONTRAST_OPTIONS[next]
}

export const storeHandedness = (hand: Handedness): void => {
  storeString(HAND_KEY, hand)
}

export const storeContrastMode = (mode: ContrastMode): void => {
  storeString(CONTRAST_KEY, mode)
}

export const storeTextScale = (scale: number): void => {
  storeNumber(TEXT_SCALE_KEY, scale)
}

export const applyAccessibilityTheme = (
  theme: ThemeDefinition,
  settings: AccessibilitySettings,
): ThemeDefinition => {
  // Create a derived theme for accessibility without mutating the base theme registry.
  const palette =
    settings.contrast === 'high'
      ? {
          ...theme.palette,
          textPrimary: '#ffffff',
          textMuted: '#e2e8f0',
          panel: '#0b1220',
          panelStroke: '#f8fafc',
        }
      : theme.palette

  const paletteNum =
    settings.contrast === 'high'
      ? {
          ...theme.paletteNum,
          panel: hexToNumber(palette.panel),
          panelStroke: hexToNumber(palette.panelStroke),
        }
      : theme.paletteNum

  return {
    ...theme,
    palette,
    paletteNum,
    ui: applyTextScale(theme.ui, settings.textScale, palette, paletteNum),
  }
}

const applyTextScale = (
  ui: ThemeUI,
  scale: number,
  palette: ThemeDefinition['palette'],
  paletteNum: ThemeDefinition['paletteNum'],
): ThemeUI => {
  const scaleSize = (value: number): number => Math.round(value * scale)
  const scaleText = (style: ThemeTextStyle, color: string): ThemeTextStyle => ({
    ...style,
    fontSize: scaleFontSize(style.fontSize, scale),
    color,
  })

  return {
    ...ui,
    scoreTextStyle: scaleText(ui.scoreTextStyle, palette.textPrimary),
    overlayTitleStyle: scaleText(ui.overlayTitleStyle, palette.textPrimary),
    overlayBodyStyle: scaleText(ui.overlayBodyStyle, palette.textMuted),
    statLabelStyle: scaleText(ui.statLabelStyle, palette.textMuted),
    statValueStyle: scaleText(ui.statValueStyle, palette.textPrimary),
    panel: {
      ...ui.panel,
      fill: paletteNum.panel,
      stroke: paletteNum.panelStroke,
    },
    panelSize: {
      small: {
        width: scaleSize(ui.panelSize.small.width),
        height: scaleSize(ui.panelSize.small.height),
      },
      large: {
        width: scaleSize(ui.panelSize.large.width),
        height: scaleSize(ui.panelSize.large.height),
      },
    },
    button: {
      ...ui.button,
      width: scaleSize(ui.button.width),
      height: scaleSize(ui.button.height),
      textStyle: scaleText(ui.button.textStyle, palette.textPrimary),
    },
    scoreFrameSize: {
      width: scaleSize(ui.scoreFrameSize.width),
      height: scaleSize(ui.scoreFrameSize.height),
    },
    icon: {
      size: scaleSize(ui.icon.size),
      padding: Math.round(ui.icon.padding * Math.min(scale, 1.15)),
    },
  }
}

const scaleFontSize = (value: string, scale: number): string => {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/)
  if (!match) {
    return value
  }
  const next = Math.max(10, Math.round(Number(match[1]) * scale))
  return `${next}px`
}

const hexToNumber = (value: string): number => {
  const normalized = value.replace('#', '')
  const parsed = Number.parseInt(normalized, 16)
  return Number.isFinite(parsed) ? parsed : 0xffffff
}

const isHandedness = (value: string | null): value is Handedness =>
  value === 'normal' || value === 'left' || value === 'right'

const isContrastMode = (value: string | null): value is ContrastMode =>
  value === 'normal' || value === 'high'
