import type { ThemeDefinition } from '../types'
import { ATLAS, FRAMES, IMAGE_KEYS, IMAGE_PATHS } from '../assets'
import { FX } from '../fx'
import { PALETTE, PALETTE_NUM } from '../palette'
import { UI } from '../ui'

export const evilForestTheme: ThemeDefinition = {
  id: 'evil-forest',
  name: 'Evil Forest Crow',
  palette: {
    background: PALETTE.night,
    textPrimary: PALETTE.textPrimary,
    textMuted: PALETTE.textMuted,
    panel: PALETTE.panel,
    panelStroke: PALETTE.panelStroke,
  },
  paletteNum: {
    panel: PALETTE_NUM.panel,
    panelStroke: PALETTE_NUM.panelStroke,
    shadow: PALETTE_NUM.shadow,
  },
  assets: {
    atlas: ATLAS,
    images: IMAGE_PATHS,
  },
  images: {
    bgFar: IMAGE_KEYS.bgFar,
    bgMid: IMAGE_KEYS.bgMid,
    bgNear: IMAGE_KEYS.bgNear,
    fog: IMAGE_KEYS.fog,
    ground: IMAGE_KEYS.ground,
    vignette: IMAGE_KEYS.vignette,
  },
  visuals: {
    bird: {
      type: 'atlas',
      key: ATLAS.key,
      idleFrame: FRAMES.crowIdle,
      flapFrames: FRAMES.crowFlap,
      deadFrame: FRAMES.crowDead,
      glowFrame: FRAMES.crowGlow,
    },
    obstacles: {
      type: 'atlas',
      key: ATLAS.key,
      topFrames: FRAMES.obstaclesTop,
      bottomFrames: FRAMES.obstaclesBottom,
    },
    ui: {
      kind: 'atlas',
      atlasKey: ATLAS.key,
      frames: {
        panelSmall: FRAMES.panelSmall,
        panelLarge: FRAMES.panelLarge,
        button: FRAMES.button,
        scoreFrame: FRAMES.scoreFrame,
        iconRestart: FRAMES.iconRestart,
        iconMuteOn: FRAMES.iconMuteOn,
        iconMuteOff: FRAMES.iconMuteOff,
        iconMotionOn: FRAMES.iconMotionOn,
        iconMotionOff: FRAMES.iconMotionOff,
        medalBronze: FRAMES.medalBronze,
        medalSilver: FRAMES.medalSilver,
        medalGold: FRAMES.medalGold,
        medalVoid: FRAMES.medalVoid,
      },
    },
    particles: {
      ember: FRAMES.particleEmber,
      dust: FRAMES.particleDust,
      leaf: FRAMES.particleLeaf,
    },
  },
  ui: UI,
  fx: FX,
}
