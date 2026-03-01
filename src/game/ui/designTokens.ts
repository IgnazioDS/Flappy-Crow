/**
 * designTokens.ts — Flappy Crow UI Phase 1 Token System
 *
 * Canonical source of truth for spacing, radii, strokes, shadows,
 * typography and colors.  Import from here; never scatter magic
 * numbers in scenes or factories.
 *
 * Material system: "Obsidian Glass + Teal Rim"
 *   Panel:    near-black fill  #07090f  with teal border 0x48c8d8
 *   HUD:      same material, tighter radius
 *   Text:     Cinzel Decorative (title) · Cinzel (body) · Space Mono (numbers)
 *
 * Coexists with designSystem.ts (v2 tokens).  Both files are valid; this
 * file adds the UIContext pattern, helper functions, and typed style bags.
 */

import type { ThemeUI } from '../theme/types'

// ─── Spacing scale (8-pt grid) ────────────────────────────────────────────────

export const DT_SPACE = {
  xs:   8,   //  8 px — tight gap / icon padding
  sm:  12,   // 12 px — default component padding
  md:  16,   // 16 px — section gap
  lg:  24,   // 24 px — panel interior padding
  xl:  32,   // 32 px — between panels / major sections
} as const

// ─── Corner radii ─────────────────────────────────────────────────────────────

export const DT_RADIUS = {
  /** HUD score capsule / compact pill widgets */
  capsule: 10,
  /** Overlay panel corners */
  panel:   12,
  /** Large modal overlay */
  overlay: 16,
  /** Icon badge / small button */
  icon:     8,
  /** Medal badge */
  medal:    6,
} as const

// ─── Stroke widths ────────────────────────────────────────────────────────────

export const DT_STROKE = {
  /** Hairline divider */
  thin:   1,
  /** Main border / panel rim */
  normal: 2,
} as const

// ─── Shadow / glow recipes ────────────────────────────────────────────────────

export const DT_SHADOW = {
  /** Soft drop: default overlay panel shadow */
  panelShadow: {
    color:   0x000000,
    alpha:   0.45,
    offsetX: 3,
    offsetY: 4,
  },
  /** Hard drop: compact HUD capsule shadow */
  capsuleShadow: {
    color:   0x000000,
    alpha:   0.55,
    offsetX: 2,
    offsetY: 3,
  },
  /** Teal rim glow alpha levels for strokes */
  rimAlpha: {
    full:    0.80,  // primary action / full emphasis
    muted:   0.65,  // standard panels
    dim:     0.45,  // HUD capsules
    divider: 0.35,  // hairline dividers
  },
  /** Subtle inner top-edge highlight rect used on overlay panels */
  innerHighlight: {
    color: 0xffffff,
    alpha: 0.03,
  },
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const DT_FONT = {
  title:  '"Cinzel Decorative", "Cinzel", serif',
  body:   '"Cinzel", serif',
  number: '"Space Mono", monospace',
} as const

/** Semantic text roles used in the UI. */
export type TypographyRole = 'title' | 'body' | 'caption' | 'number'

/** Per-role typographic definition (rendering-independent). */
export type TextStyleDef = {
  fontFamily:      string
  fontSize:        string
  strokeThickness: number
  /** Present for roles that centre their text. */
  align?:          string
}

export const DT_TYPOGRAPHY: Record<TypographyRole, TextStyleDef> = {
  /** Overlay title — Cinzel Decorative, 26 px */
  title: {
    fontFamily:      DT_FONT.title,
    fontSize:        '26px',
    strokeThickness: 4,
    align:           'center',
  },
  /** Body / subtitle — Cinzel, 17 px */
  body: {
    fontFamily:      DT_FONT.body,
    fontSize:        '17px',
    strokeThickness: 3,
    align:           'center',
  },
  /** Caption / label — Cinzel, 13 px */
  caption: {
    fontFamily:      DT_FONT.body,
    fontSize:        '13px',
    strokeThickness: 2,
    align:           'center',
  },
  /** Score / stat values — Space Mono, 36 px */
  number: {
    fontFamily:      DT_FONT.number,
    fontSize:        '36px',
    strokeThickness: 5,
  },
} as const

// ─── Color tokens ─────────────────────────────────────────────────────────────

export const DT_COLOR = {
  // Panel material — numeric for Phaser fillStyle / lineStyle
  panelFill:        0x07090f,   // "Obsidian" panel background
  panelStroke:      0x48c8d8,   // "Teal Rim" accent border

  // Text — string for Phaser Text style color / stroke
  textPrimary:      '#d7f5ff',  // main readable white-blue
  textMuted:        '#9fb2c1',  // secondary / labels

  // Accent (both forms for convenience)
  accentTeal:       '#48c8d8',  // CSS string — rim / border
  accentTealNum:    0x48c8d8,   // Phaser numeric

  // Additional accent colors (CSS + numeric pairs)
  tealBright:       '#9ef1ff',  // bright teal — icon tints, highlights, glows
  tealBrightNum:    0x9ef1ff,   // Phaser numeric
  gold:             '#f5c842',  // gold medal / "NEW BEST" badge text
  goldNum:          0xf5c842,   // Phaser numeric

  // Alpha presets
  panelFillAlpha:   0.93,
  panelStrokeAlpha: 0.80,

  // Text stroke background
  strokeBg:         '#0a0b12',
} as const

// ─── Badge / state-indicator tokens ──────────────────────────────────────────

/**
 * Fill and stroke alpha levels for toggle-state badges in the settings panel.
 * Also provides standard sizing constants for the badge shape.
 */
export const DT_BADGE = {
  /** Fill alpha — feature enabled / ON */
  fillOn:        0.22,
  /** Fill alpha — feature disabled / OFF */
  fillOff:       0.18,
  /** Fill alpha — neutral / non-binary value */
  fillNeutral:   0.20,
  /** Stroke alpha — feature enabled / ON */
  strokeOn:      0.70,
  /** Stroke alpha — feature disabled / OFF */
  strokeOff:     0.40,
  /** Stroke alpha — neutral */
  strokeNeutral: 0.55,
  /** Minimum badge width (px) */
  minWidth:      56,
  /** Horizontal padding inside badge (px) */
  paddingX:      12,
  /** Minimum badge height (px) */
  minHeight:     28,
} as const

// ─── Motion / animation tuning ────────────────────────────────────────────────

/**
 * Spatial and scale constants for UI animations.
 * Timing durations live in designSystem.ts MOTION; this covers the rest.
 */
export const DT_MOTION = {
  /** Overlay slide-in start offset (px upward from resting position) */
  overlaySlideY:    14,
  /** Scale multiplier for score-pop burst (scaleX = base × this) */
  scorePopScale:    1.18,
  /** Minimum alpha for tap-prompt pulse loop */
  tapPulseAlphaMin: 0.40,
} as const

// ─── V3 skin tokens ───────────────────────────────────────────────────────────

/**
 * DT_V3 — premium v3 visual overrides layered on top of the Phase 1 token base.
 * Consumed by Modal.ts, Chip.ts, Button.ts components and uiMotion.ts.
 */
export const DT_V3 = {
  panel: {
    /** Corner radius — slightly larger than v2 for a softer look */
    radius:              14,
    /** Top gradient colour (slightly lighter) */
    gradientTop:         '#0d1425',
    /** Mid gradient transition */
    gradientMid:         '#090c18',
    /** Bottom gradient colour (full obsidian) */
    gradientBot:         '#07090f',
    /** Teal rim stroke alpha */
    rimAlpha:            0.72,
    /** Outer glow alpha (dim halo around the rim) */
    rimGlowAlpha:        0.14,
    /** Extra stroke width for glow pass (px) */
    rimGlowSpread:       4,
    /** Height of the inner top-edge highlight strip (px) */
    innerHighlightH:     8,
    /** Alpha for the inner top-edge highlight */
    innerHighlightAlpha: 0.05,
  },
  chip: {
    /** Border radius of value chips */
    radius:   6,
    /** Fixed chip height (px) */
    height:   28,
    /** Minimum chip width before text overflow (px) */
    minWidth: 62,
    /** Horizontal padding inside chip (px each side) */
    paddingX: 14,
  },
  button: {
    /** Primary button height (px) */
    primaryH:        48,
    /** Primary button end radius — fully rounded (= primaryH / 2) */
    primaryRadius:   24,
    /** Secondary button height (px) */
    secondaryH:      36,
    /** Secondary button end radius */
    secondaryRadius: 18,
    /** Gap between icon and label in primary button (px) */
    iconGap:         10,
  },
  motion: {
    /** Modal open animation duration (ms) */
    modalInMs:      200,
    /** Modal close animation duration (ms) */
    modalOutMs:     140,
    /** Modal slide-in distance (px upward from rest) */
    modalSlideY:    8,
    /** Scale origin for modal open animation */
    modalScaleFrom: 0.97,
  },
  typography: {
    /** Instruction / subtitle text size */
    instructionSize:       '12px',
    /** Letter spacing for modal headline text */
    headlineLetterSpacing: 2,
  },
} as const

// ─── Aggregate token bag ──────────────────────────────────────────────────────

export type UITokens = {
  space:      typeof DT_SPACE
  radii:      typeof DT_RADIUS
  stroke:     typeof DT_STROKE
  shadow:     typeof DT_SHADOW
  font:       typeof DT_FONT
  typography: typeof DT_TYPOGRAPHY
  color:      typeof DT_COLOR
  badge:      typeof DT_BADGE
  motion:     typeof DT_MOTION
  v3:         typeof DT_V3
}

/** Pre-built token bag — import this when you need the full set. */
export const UI_TOKENS: UITokens = {
  space:      DT_SPACE,
  radii:      DT_RADIUS,
  stroke:     DT_STROKE,
  shadow:     DT_SHADOW,
  font:       DT_FONT,
  typography: DT_TYPOGRAPHY,
  color:      DT_COLOR,
  badge:      DT_BADGE,
  motion:     DT_MOTION,
  v3:         DT_V3,
}

// ─── Safe area ────────────────────────────────────────────────────────────────

export type SafeArea = {
  top:    number
  bottom: number
  left:   number
  right:  number
}

// ─── UIContext ────────────────────────────────────────────────────────────────

/**
 * UIContext bundles every UI-creation dependency into one typed object.
 * Pass this to uiFactory helpers instead of the scattered (ui, theme) pair.
 */
export type UIContext = {
  /** Full design token bag. */
  tokens:        UITokens
  /** Active theme's UI config (panel colors, text styles, layout). */
  themeUi:       ThemeUI
  /** Device safe-area insets (notch / home indicator offsets). */
  safeArea:      SafeArea
  /** Whether the user prefers reduced motion. */
  reducedMotion: boolean
}

/** Build a UIContext from its constituent parts. */
export const makeUIContext = (
  themeUi:       ThemeUI,
  safeArea:      SafeArea,
  reducedMotion: boolean,
): UIContext => ({
  tokens:  UI_TOKENS,
  themeUi,
  safeArea,
  reducedMotion,
})

// ─── Text style helper ────────────────────────────────────────────────────────

/** Phaser-compatible text style — safe to spread into `scene.add.text(...)`. */
export type PhaserTextStyle = {
  fontFamily:      string
  fontSize:        string
  color:           string
  stroke:          string
  strokeThickness: number
  align?:          string
}

/**
 * Returns a ready-to-use Phaser text style for a given semantic role.
 *
 * When `themeUi` is supplied its text colors are used as overrides so
 * that per-theme palettes (e.g. high-contrast mode) are respected.
 */
export const getTextStyle = (
  role:     TypographyRole,
  themeUi?: ThemeUI,
): PhaserTextStyle => {
  const def = DT_TYPOGRAPHY[role]

  // Resolve color — prefer theme overrides where semantically appropriate
  let color: string
  if (role === 'caption') {
    color = themeUi?.statLabelStyle?.color  ??
            themeUi?.tokenOverrides?.textMuted ??
            DT_COLOR.textMuted
  } else if (role === 'number') {
    color = themeUi?.scoreTextStyle?.color  ??
            themeUi?.tokenOverrides?.textPrimary ??
            DT_COLOR.textPrimary
  } else {
    // title / body
    color = themeUi?.overlayTitleStyle?.color ??
            themeUi?.tokenOverrides?.textPrimary ??
            DT_COLOR.textPrimary
  }

  const style: PhaserTextStyle = {
    fontFamily:      def.fontFamily,
    fontSize:        def.fontSize,
    color,
    stroke:          DT_COLOR.strokeBg,
    strokeThickness: def.strokeThickness,
  }
  if (def.align) style.align = def.align
  return style
}

// ─── Panel style helper ───────────────────────────────────────────────────────

/** Fully resolved panel drawing descriptor for Phaser Graphics calls. */
export type PanelStyle = {
  fillColor:     number
  fillAlpha:     number
  strokeColor:   number
  strokeAlpha:   number
  strokeWidth:   number
  radius:        number
  shadowColor:   number
  shadowAlpha:   number
  shadowOffsetX: number
  shadowOffsetY: number
}

/**
 * Returns a fully resolved panel or capsule drawing style.
 *
 * When `themeUi` is supplied its `panel` config and `tokenOverrides`
 * take precedence over the base tokens.
 */
export const getPanelStyle = (
  kind:     'panel' | 'capsule',
  themeUi?: ThemeUI,
): PanelStyle => {
  const fillColor   = themeUi?.panel?.fill   ?? DT_COLOR.panelFill
  const strokeColor = themeUi?.panel?.stroke ?? DT_COLOR.panelStroke
  const fillAlpha   =
    themeUi?.tokenOverrides?.panelFillAlpha ??
    themeUi?.panel?.alpha ??
    DT_COLOR.panelFillAlpha

  if (kind === 'capsule') {
    const s = DT_SHADOW.capsuleShadow
    return {
      fillColor,
      fillAlpha,
      strokeColor,
      strokeAlpha:   DT_SHADOW.rimAlpha.dim,
      strokeWidth:   DT_STROKE.normal,
      radius:        DT_RADIUS.capsule,
      shadowColor:   s.color,
      shadowAlpha:   s.alpha,
      shadowOffsetX: s.offsetX,
      shadowOffsetY: s.offsetY,
    }
  }

  const s = DT_SHADOW.panelShadow
  return {
    fillColor,
    fillAlpha,
    strokeColor,
    strokeAlpha:   DT_SHADOW.rimAlpha.full,
    strokeWidth:   DT_STROKE.normal,
    radius:        DT_RADIUS.panel,
    shadowColor:   s.color,
    shadowAlpha:   s.alpha,
    shadowOffsetX: s.offsetX,
    shadowOffsetY: s.offsetY,
  }
}
