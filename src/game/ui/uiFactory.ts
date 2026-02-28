/**
 * uiFactory.ts — Phaser game-object factories for the obsidian-glass UI system.
 * All visual constants are sourced from designSystem.ts.
 */
import Phaser from 'phaser'
import type { ThemeDefinition, ThemeUI } from '../theme/types'
import { COLOR_NUM, PANEL_ALPHA, RADIUS, SHADOW, STROKE } from './designSystem'

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
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle => {
  const uiAssets = theme.visuals.ui
  const panelSize = ui.panelSize[size]
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

  return scene.add
    .rectangle(0, 0, panelWidth, panelHeight, ui.panel.fill, ui.panel.alpha)
    .setStrokeStyle(ui.panel.strokeThickness, ui.panel.stroke)
}

// ─── Button base ─────────────────────────────────────────────────────────────

export const createButtonBase = (
  scene: Phaser.Scene,
  ui: ThemeUI,
  theme: ThemeDefinition,
  scale = 1,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle => {
  const uiAssets = theme.visuals.ui
  if (uiAssets.kind === 'atlas' && uiAssets.atlasKey && uiAssets.frames?.button) {
    const image = scene.add.image(0, 0, uiAssets.atlasKey, uiAssets.frames.button)
    image.setScale(scale)
    return image
  }

  const width  = ui.button.width  * scale
  const height = ui.button.height * scale
  return scene.add
    .rectangle(0, 0, width, height, ui.panel.fill, ui.panel.alpha)
    .setStrokeStyle(ui.panel.strokeThickness, ui.panel.stroke)
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
  button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container,
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

// ─── Small text button ────────────────────────────────────────────────────────

export const createSmallButton = (
  scene: Phaser.Scene,
  ui: ThemeUI,
  theme: ThemeDefinition,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container => {
  const buttonImage = createButtonBase(scene, ui, theme, 0.4)
  applyMinHitArea(buttonImage)
  applyButtonFeedback(buttonImage)

  const text = scene.add
    .text(0, 1, label, ui.button.textStyle)
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
  g.fillStyle(0xffffff, 0.03)
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
  g.fillStyle(COLOR_NUM.shadow, 0.5)
  g.fillRoundedRect(-hw + 2, -hh + 3, width, height, r)

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
  alpha = 0.35,
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics()
  g.lineStyle(STROKE.hairline, COLOR_NUM.tealRim, alpha)
  g.beginPath()
  g.moveTo(-width / 2, 0)
  g.lineTo( width / 2, 0)
  g.strokePath()
  return g
}
