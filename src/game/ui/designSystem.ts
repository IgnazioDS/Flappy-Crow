/**
 * designSystem.ts — Flappy Crow UI Design System v2
 *
 * Single source-of-truth for all design tokens.
 * Import this file; do NOT scatter magic numbers in scenes or factories.
 *
 * Material system: "Obsidian Glass + Teal Rim"
 *   Panel: near-black (#07090f) with teal border (0x48c8d8)
 *   Corner: sharp capsule (r=10) for HUD widgets; rounder (r=14) for panels
 *   Typography: Cinzel Decorative (title) / Cinzel (body) / Space Mono (numbers)
 */

// ─── Color tokens ─────────────────────────────────────────────────────────────

export const COLOR = {
  // Backgrounds
  void:        '#02010a' as const,   // deepest black
  night:       '#0a0b12' as const,   // scene background
  obsidian:    '#07090f' as const,   // panel fill
  obsidianMid: '#0e1220' as const,   // hover / raised panel
  bark:        '#17131f' as const,   // subtle mid-tone

  // Stroke / accent
  tealRim:     '#48c8d8' as const,   // main border/accent
  tealBright:  '#9ef1ff' as const,   // icon tint, highlight
  tealGlow:    '#2bb8cc' as const,   // softer glow shadow

  // Text
  textPrimary: '#d7f5ff' as const,   // main readable white-blue
  textMuted:   '#9fb2c1' as const,   // secondary / labels
  textDim:     '#627585' as const,   // placeholder / disabled

  // Semantic
  danger:      '#ff4060' as const,   // death flash
  warning:     '#ffb06a' as const,   // ember / alert
  success:     '#5ad5e8' as const,   // score bonus (alias teal)
  gold:        '#f5c842' as const,   // gold medal
  silver:      '#c0cdd8' as const,   // silver medal
  bronze:      '#d4894a' as const,   // bronze medal
  platinum:    '#c4e0f0' as const,   // platinum medal
} as const

// Numeric versions for Phaser APIs
export const COLOR_NUM = {
  obsidian:    0x07090f as const,
  obsidianMid: 0x0e1220 as const,
  tealRim:     0x48c8d8 as const,
  tealBright:  0x9ef1ff as const,
  tealGlow:    0x2bb8cc as const,
  shadow:      0x000000 as const,
  danger:      0xff4060 as const,
  gold:        0xf5c842 as const,
  silver:      0xc0cdd8 as const,
  bronze:      0xd4894a as const,
  platinum:    0xc4e0f0 as const,
} as const

// ─── Spacing scale (8-pt grid) ────────────────────────────────────────────────

export const SPACE = {
  xs:  4 as const,   //  4 px — micro gap
  sm:  8 as const,   //  8 px — tight
  md: 12 as const,   // 12 px — default padding
  lg: 16 as const,   // 16 px — section gap
  xl: 24 as const,   // 24 px — panel padding
  xxl:32 as const,   // 32 px — between panels
} as const

// ─── Corner radii ─────────────────────────────────────────────────────────────

export const RADIUS = {
  /** Full capsule (e.g. score widget) — tall enough to read as pill */
  capsule:  10 as const,
  /** Standard panel corners */
  panel:    12 as const,
  /** Large overlay panels */
  overlay:  16 as const,
  /** Icon-only button or badge */
  icon:      8 as const,
  /** Medal badge */
  medal:     6 as const,
} as const

// ─── Stroke widths ────────────────────────────────────────────────────────────

export const STROKE = {
  hairline: 1 as const,  // subtle divider
  thin:     1.5 as const,// text shadow rim
  panel:    2 as const,  // main border
  thick:    3 as const,  // emphasis
} as const

// ─── Glow / shadow recipes ───────────────────────────────────────────────────

export const SHADOW = {
  /** Soft drop: default panel shadow */
  dropSoft: { dx: 3, dy: 4, alpha: 0.45 } as const,
  /** Hard drop: compact HUD widget */
  dropHard: { dx: 2, dy: 3, alpha: 0.55 } as const,
  /** Teal rim glow alpha on strokes */
  rimAlpha: { full: 0.80, muted: 0.65, dim: 0.45 } as const,
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = {
  title:   '"Cinzel Decorative", "Cinzel", serif' as const,
  body:    '"Cinzel", serif' as const,
  numbers: '"Space Mono", monospace' as const,
} as const

/**
 * Text role → Phaser text style factory.
 * Always returns a plain object (no class) — safe to spread.
 */
export type TextRole =
  | 'headline'   // overlay title (Cinzel Decorative, large)
  | 'title'      // section title (Cinzel Decorative, medium)
  | 'body'       // body / subtitle (Cinzel, regular)
  | 'caption'    // secondary hint (Cinzel, small)
  | 'numbers'    // score / stat values (Space Mono)
  | 'numbersSm'  // small numeric labels (Space Mono, small)
  | 'label'      // HUD label (Cinzel, tiny)
  | 'button'     // call-to-action button text

export type PhaserTextStyle = {
  fontFamily: string
  fontSize: string
  color: string
  stroke?: string
  strokeThickness?: number
  align?: string
}

export const createTextStyle = (
  role: TextRole,
  overrides: Partial<PhaserTextStyle> = {},
): PhaserTextStyle => {
  const base = TEXT_ROLE_MAP[role]
  return { ...base, ...overrides }
}

const TEXT_ROLE_MAP: Record<TextRole, PhaserTextStyle> = {
  headline: {
    fontFamily: FONT.title,
    fontSize:   '28px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 4,
    align:      'center',
  },
  title: {
    fontFamily: FONT.title,
    fontSize:   '22px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 3,
    align:      'center',
  },
  body: {
    fontFamily: FONT.body,
    fontSize:   '17px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 3,
    align:      'center',
  },
  caption: {
    fontFamily: FONT.body,
    fontSize:   '13px',
    color:      COLOR.textMuted,
    stroke:     COLOR.night,
    strokeThickness: 2,
    align:      'center',
  },
  numbers: {
    fontFamily: FONT.numbers,
    fontSize:   '36px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 5,
  },
  numbersSm: {
    fontFamily: FONT.numbers,
    fontSize:   '22px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 4,
  },
  label: {
    fontFamily: FONT.body,
    fontSize:   '12px',
    color:      COLOR.textMuted,
    stroke:     COLOR.night,
    strokeThickness: 2,
  },
  button: {
    fontFamily: FONT.title,
    fontSize:   '17px',
    color:      COLOR.textPrimary,
    stroke:     COLOR.night,
    strokeThickness: 3,
    align:      'center',
  },
} as const

// ─── Panel fill / stroke alpha presets ───────────────────────────────────────

export const PANEL_ALPHA = {
  fill:   0.93 as const,  // main panel body opacity
  stroke: 0.80 as const,  // rim stroke
  dim:    0.70 as const,  // secondary / muted rim
} as const

// ─── Animation / motion timings ──────────────────────────────────────────────

export const MOTION = {
  /** Overlay slide-in duration (ms) */
  overlayIn:    220 as const,
  /** Overlay fade-out duration (ms) */
  overlayOut:   160 as const,
  /** Score pulse pop (ms) */
  scorePop:     120 as const,
  /** Button press feedback (ms) */
  buttonPress:   80 as const,
  /** "New Best" badge bounce (ms) */
  badgeBounce:  300 as const,
  /** Tap pulse cycle (ms) — ready screen hint */
  tapPulse:    1400 as const,
} as const

// ─── Layout / safe-area ──────────────────────────────────────────────────────

export const LAYOUT = {
  /** Top of HUD content (adds to safeArea.top) */
  hudTopY:     28 as const,
  /** Score capsule width */
  scoreCapsuleW: 156 as const,
  /** Score capsule height */
  scoreCapsuleH:  48 as const,
  /** Settings button capsule width */
  settingsCapsuleW: 52 as const,
  /** Settings button capsule height */
  settingsCapsuleH: 32 as const,
  /** Icon size in HUD (px) */
  iconSize:    26 as const,
  /** Padding between icons */
  iconGap:     10 as const,
  /** Side padding from screen edge */
  sidePad:     10 as const,
} as const

// ─── Touch target minimum (WCAG / Apple HIG) ─────────────────────────────────
export const MIN_HIT = 44 as const
