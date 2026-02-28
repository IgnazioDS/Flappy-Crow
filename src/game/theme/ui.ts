/**
 * theme/ui.ts — Default UI config built on the v2 design system tokens.
 * All values come from designSystem.ts; no bare magic numbers.
 */
import {
  COLOR,
  COLOR_NUM,
  FONT,
  LAYOUT,
  SPACE,
} from '../ui/designSystem'

export const UI = {
  fonts: {
    title:   FONT.title,
    body:    FONT.body,
    numbers: FONT.numbers,
  },

  // ─── HUD score position (centred) ──────────────────────────────────────────
  score: {
    x: 180,
    y: 28,
  },

  // ─── Text styles ───────────────────────────────────────────────────────────
  scoreTextStyle: {
    fontFamily: FONT.numbers,
    fontSize:   '36px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 5,
  },
  overlayTitleStyle: {
    fontFamily: FONT.title,
    fontSize:   '26px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 4,
    align:      'center',
  },
  overlayBodyStyle: {
    fontFamily: FONT.body,
    fontSize:   '17px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 3,
    align:      'center',
  },
  statLabelStyle: {
    fontFamily: FONT.body,
    fontSize:   '13px',
    color:      COLOR.textMuted,
    stroke:     COLOR.night,
    strokeThickness: 2,
  },
  statValueStyle: {
    fontFamily: FONT.numbers,
    fontSize:   '22px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 4,
  },

  // ─── Panel ─────────────────────────────────────────────────────────────────
  panel: {
    fill:            COLOR_NUM.obsidian,
    stroke:          COLOR_NUM.tealRim,
    strokeThickness: 2,
    alpha:           0.93,
  },
  panelSize: {
    small: { width: 300, height: 128 },
    large: { width: 320, height: 260 },
  },

  // ─── Overlay anchor positions ───────────────────────────────────────────────
  layout: {
    ready: {
      x: 180,
      y: 220,
    },
    gameOver: {
      x: 180,
      y: 310,
    },
  },

  // ─── Primary action button ──────────────────────────────────────────────────
  button: {
    width:  200,
    height:  52,
    textStyle: {
      fontFamily: FONT.title,
      fontSize:   '17px',
      color:      COLOR.textPrimary,
      stroke:     COLOR.night,
      strokeThickness: 3,
    },
  },

  // ─── Score capsule / frame ─────────────────────────────────────────────────
  scoreFrameSize: {
    width:  LAYOUT.scoreCapsuleW,
    height: LAYOUT.scoreCapsuleH,
  },

  // ─── Icon HUD ──────────────────────────────────────────────────────────────
  icon: {
    size:    LAYOUT.iconSize,
    padding: LAYOUT.sidePad,
  },

  // ─── HUD scrim ─────────────────────────────────────────────────────────────
  hud: {
    topScrimHeight: 80,
    topScrimAlpha:  0.65,
    safeTop:        SPACE.sm,
  },

  // ─── 8-pt spacing scale ────────────────────────────────────────────────────
  spacing: {
    xs: SPACE.xs,
    sm: SPACE.sm,
    md: SPACE.md,
    lg: SPACE.lg,
  },
} as const
