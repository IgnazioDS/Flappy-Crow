/**
 * uiFactory.ts — Phaser game-object factories for the obsidian-glass UI system.
 *
 * All visual constants come from designTokens.ts (Phase 1 token system).
 * Legacy imports from designSystem.ts are kept for backward compat while
 * callers migrate to UIContext.
 */
import Phaser from 'phaser'
import type { ThemeDefinition, ThemeUI } from '../theme/types'
import { COLOR_NUM, PANEL_ALPHA, RADIUS, SHADOW, STROKE } from './designSystem'
import {
  DT_V3,
  DT_COLOR,
  DT_SHADOW,
  DT_STROKE,
  getPanelStyle,
  type UIContext,
} from './designTokens'

// ─── Canvas-texture keys ─────────────────────────────────────────────────────
const HUD_SCRIM_KEY = 'hud-top-scrim'

// ─── Panel ───────────────────────────────────────────────────────────────────

export const createPanel = (
  scene: Phaser.Scene,
  ui: ThemeUI,
  theme: ThemeDefinition,
  size: 'small' | 'large',
  widthOverride?: number,
  heightOverride?: number,
  /** Optional UIContext — when provided its themeUi and tokens take precedence. */
  ctx?: UIContext,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle => {
  const resolvedUi = ctx?.themeUi ?? ui
  const uiAssets = theme.visuals.ui
  const panelSize = resolvedUi.panelSize[size]
  const panelWidth  = widthOverride  ?? panelSize.width
  const panelHeight = heightOverride ?? panelSize.height

  if (
    uiAssets.kind === 'atlas' &&
    uiAssets.atlasKey &&
    ((size === 'small' && uiAssets.frames?.panelSmall) ||
     (size === 'large' && uiAssets.frames?.panelLarge))
  ) {
    const frame = size === 'small' ? uiAssets.frames?.panelSmall : uiAssets.frames?.panelLarge
    return scene.add
      .image(0, 0, uiAssets.atlasKey, frame)
      .setDisplaySize(panelWidth, panelHeight)
  }

  const ps = getPanelStyle('panel', resolvedUi)
  return scene.add
    .rectangle(0, 0, panelWidth, panelHeight, ps.fillColor, ps.fillAlpha)
    .setStrokeStyle(ps.strokeWidth, ps.strokeColor)
}

// ─── Button base ─────────────────────────────────────────────────────────────

export const createButtonBase = (
  scene: Phaser.Scene,
  ui: ThemeUI,
  theme: ThemeDefinition,
  scale = 1,
  /** Optional UIContext — when provided its themeUi and tokens take precedence. */
  ctx?: UIContext,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle => {
  const resolvedUi = ctx?.themeUi ?? ui
  const uiAssets = theme.visuals.ui
  if (uiAssets.kind === 'atlas' && uiAssets.atlasKey && uiAssets.frames?.button) {
    const image = scene.add.image(0, 0, uiAssets.atlasKey, uiAssets.frames.button)
    image.setScale(scale)
    return image
  }

  const width  = resolvedUi.button.width  * scale
  const height = resolvedUi.button.height * scale
  const ps = getPanelStyle('panel', resolvedUi)
  return scene.add
    .rectangle(0, 0, width, height, ps.fillColor, ps.fillAlpha)
    .setStrokeStyle(ps.strokeWidth, ps.strokeColor)
}

// ─── Hit area helpers ─────────────────────────────────────────────────────────

export const applyMinHitArea = (
  button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle,
  minSize = 44,
): void => {
  const width  = Math.max(button.displayWidth,  minSize)
  const height = Math.max(button.displayHeight, minSize)
  const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height)
  button.setInteractive({
    hitArea,
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  })
}

// ─── Button feedback ─────────────────────────────────────────────────────────

export const applyButtonFeedback = (
  button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container | Phaser.GameObjects.Graphics,
): void => {
  const bx = button.scaleX
  const by = button.scaleY
  let over = false

  button.on('pointerover',     () => { over = true;  button.setScale(bx * 1.04, by * 1.04) })
  button.on('pointerout',      () => { over = false; button.setScale(bx, by) })
  button.on('pointerdown',     () => { button.setScale(bx * 0.97, by * 0.97) })
  button.on('pointerup',       () => { button.setScale(over ? bx * 1.04 : bx, over ? by * 1.04 : by) })
  button.on('pointerupoutside',() => { button.setScale(bx, by) })
}

// ─── Button feedback v3 ───────────────────────────────────────────────────────

/**
 * Minimal scale press feedback (0.98 on down, restore on up).
 * isReduced is evaluated at event time so toggling reducedMotion at runtime
 * is respected without rebinding.  If isReduced() returns true, no scale
 * change is applied.
 */
export const applyButtonFeedbackV3 = (
  button:    Phaser.GameObjects.Image | Phaser.GameObjects.Container | Phaser.GameObjects.Graphics,
  isReduced: () => boolean,
): void => {
  const bx = button.scaleX
  const by = button.scaleY
  button.on('pointerdown',     () => { if (!isReduced()) button.setScale(bx * 0.98, by * 0.98) })
  button.on('pointerup',       () => { button.setScale(bx, by) })
  button.on('pointerupoutside',() => { button.setScale(bx, by) })
}

// ─── Small text button ────────────────────────────────────────────────────────

export const createSmallButton = (
  scene: Phaser.Scene,
  ui: ThemeUI,
  theme: ThemeDefinition,
  label: string,
  onClick: () => void,
  /** Optional UIContext — when provided its themeUi and tokens take precedence. */
  ctx?: UIContext,
): Phaser.GameObjects.Container => {
  const resolvedUi = ctx?.themeUi ?? ui
  const buttonImage = createButtonBase(scene, ui, theme, 0.4, ctx)
  applyMinHitArea(buttonImage)
  applyButtonFeedback(buttonImage)

  const text = scene.add
    .text(0, 1, label, resolvedUi.button.textStyle)
    .setOrigin(0.5, 0.5)
    .setScale(0.75)

  buttonImage.on(
    'pointerdown',
    (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation()
      onClick()
    },
  )

  return scene.add.container(0, 0, [buttonImage, text])
}

// ─── HUD scrim ────────────────────────────────────────────────────────────────

/**
 * Creates (or reuses) a programmatic canvas texture: vertical gradient from
 * dark at top → transparent at bottom.  Placed at (0,0) origin top-left.
 */
export const createHudTopScrim = (
  scene: Phaser.Scene,
  width: number,
  scrimHeight: number,
  scrimAlpha: number,
  depth = 3.95,
): Phaser.GameObjects.Image => {
  if (!scene.textures.exists(HUD_SCRIM_KEY)) {
    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = scrimHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, scrimHeight)
      grad.addColorStop(0,    `rgba(2,1,10,${scrimAlpha.toFixed(3)})`)
      grad.addColorStop(0.55, `rgba(2,1,10,${(scrimAlpha * 0.45).toFixed(3)})`)
      grad.addColorStop(1,    'rgba(2,1,10,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, scrimHeight)
    }
    scene.textures.addCanvas(HUD_SCRIM_KEY, canvas)
  }
  return scene.add.image(0, 0, HUD_SCRIM_KEY).setOrigin(0, 0).setDepth(depth)
}

// ─── HUD capsule ─────────────────────────────────────────────────────────────

/**
 * Compact obsidian-glass capsule for HUD widgets (score, icon cluster, SET).
 * Centred at (0,0).  Uses design-token constants throughout.
 */
export const createHudCapsule = (
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics => {
  const g  = scene.add.graphics()
  const r  = RADIUS.capsule
  const hw = width  / 2
  const hh = height / 2

  // 1. Drop shadow
  g.fillStyle(COLOR_NUM.shadow, SHADOW.dropHard.alpha)
  g.fillRoundedRect(-hw + SHADOW.dropHard.dx, -hh + SHADOW.dropHard.dy, width, height, r)

  // 2. Obsidian fill
  g.fillStyle(COLOR_NUM.obsidian, PANEL_ALPHA.fill)
  g.fillRoundedRect(-hw, -hh, width, height, r)

  // 3. Teal rim
  g.lineStyle(STROKE.panel, COLOR_NUM.tealRim, SHADOW.rimAlpha.dim)
  g.strokeRoundedRect(-hw, -hh, width, height, r)

  return g
}

// ─── HUD capsule v3 ───────────────────────────────────────────────────────────

/**
 * V3 HUD capsule — pill/stadium shape with obsidian fill + teal rim (muted).
 * Rim alpha = DT_SHADOW.rimAlpha.muted (0.65) vs old capsule's dim (0.45).
 * Adds outer glow + inner top highlight matching the v3 modal vocabulary.
 * Radius = height/2 (fully rounded pill ends).
 */
export const createHudCapsuleV3 = (
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics => {
  const g  = scene.add.graphics()
  const r  = height / 2
  const hw = width  / 2
  const hh = height / 2
  const sh = DT_SHADOW.capsuleShadow

  // 1. Drop shadow
  g.fillStyle(sh.color, sh.alpha)
  g.fillRoundedRect(-hw + sh.offsetX, -hh + sh.offsetY, width, height, r)

  // 2. Outer glow (wide dim teal stroke beneath the rim)
  g.lineStyle(DT_STROKE.normal + DT_V3.panel.rimGlowSpread, DT_COLOR.accentTealNum, DT_V3.panel.rimGlowAlpha)
  g.strokeRoundedRect(-hw, -hh, width, height, r)

  // 3. Obsidian fill
  g.fillStyle(DT_COLOR.panelFill, DT_COLOR.panelFillAlpha)
  g.fillRoundedRect(-hw, -hh, width, height, r)

  // 4. Inner top highlight strip
  g.fillStyle(DT_SHADOW.innerHighlight.color, DT_V3.panel.innerHighlightAlpha)
  g.fillRoundedRect(-hw, -hh, width, Math.min(height * 0.15, 6), { tl: r, tr: r, bl: 0, br: 0 })

  // 5. Teal rim (muted — slightly brighter than old dim capsule)
  g.lineStyle(DT_STROKE.normal, DT_COLOR.accentTealNum, DT_SHADOW.rimAlpha.muted)
  g.strokeRoundedRect(-hw, -hh, width, height, r)

  return g
}

// ─── Panel backdrop ───────────────────────────────────────────────────────────

/**
 * Layered obsidian-glass backdrop for overlay panels:
 *   1. Drop shadow offset rect
 *   2. Dark fill (obsidian)
 *   3. Teal accent stroke
 *
 * Centred at (0,0).  Add as first child of a Container.
 */
export const createPanelBackdrop = (
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics => {
  const g  = scene.add.graphics()
  const r  = RADIUS.panel
  const hw = width  / 2
  const hh = height / 2

  // 1. Drop shadow
  g.fillStyle(COLOR_NUM.shadow, SHADOW.dropSoft.alpha)
  g.fillRoundedRect(-hw + SHADOW.dropSoft.dx, -hh + SHADOW.dropSoft.dy, width, height, r)

  // 2. Inner highlight (very subtle top-edge light)
  g.fillStyle(DT_SHADOW.innerHighlight.color, DT_SHADOW.innerHighlight.alpha)
  g.fillRoundedRect(-hw, -hh, width, 4, { tl: r, tr: r, bl: 0, br: 0 })

  // 3. Obsidian fill
  g.fillStyle(COLOR_NUM.obsidian, PANEL_ALPHA.fill)
  g.fillRoundedRect(-hw, -hh, width, height, r)

  // 4. Teal rim stroke
  g.lineStyle(STROKE.panel, COLOR_NUM.tealRim, SHADOW.rimAlpha.full)
  g.strokeRoundedRect(-hw, -hh, width, height, r)

  return g
}

// ─── Primary action button backdrop (full-width) ──────────────────────────────

/**
 * Draws an obsidian-glass button shape centred at (0,0).
 * Used for the PLAY AGAIN button and other primary CTAs.
 */
export const createPrimaryButtonBackdrop = (
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics => {
  const g  = scene.add.graphics()
  const r  = RADIUS.capsule
  const hw = width  / 2
  const hh = height / 2

  // Shadow
  g.fillStyle(COLOR_NUM.shadow, DT_SHADOW.capsuleShadow.alpha)
  g.fillRoundedRect(-hw + DT_SHADOW.capsuleShadow.offsetX, -hh + DT_SHADOW.capsuleShadow.offsetY, width, height, r)

  // Fill — slightly lighter obsidian for buttons
  g.fillStyle(COLOR_NUM.obsidianMid, PANEL_ALPHA.fill)
  g.fillRoundedRect(-hw, -hh, width, height, r)

  // Bright teal rim — primary action emphasis
  g.lineStyle(STROKE.panel, COLOR_NUM.tealRim, SHADOW.rimAlpha.full)
  g.strokeRoundedRect(-hw, -hh, width, height, r)

  return g
}

// ─── Divider line ─────────────────────────────────────────────────────────────

/**
 * A subtle teal hairline divider (horizontal).
 * Centred at (0,0).  Width = line length.
 */
export const createDivider = (
  scene: Phaser.Scene,
  width: number,
  alpha: number = DT_SHADOW.rimAlpha.divider,
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics()
  g.lineStyle(DT_STROKE.thin, COLOR_NUM.tealRim, alpha)
  g.beginPath()
  g.moveTo(-width / 2, 0)
  g.lineTo( width / 2, 0)
  g.strokePath()
  return g
}
