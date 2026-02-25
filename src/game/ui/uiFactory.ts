import Phaser from 'phaser'
import type { ThemeDefinition, ThemeUI } from '../theme/types'
import { PALETTE_NUM } from '../theme/palette'

// ─── Canvas-texture keys ────────────────────────────────────────────────────
// Programmatic textures are generated once per scene session and reused.
const HUD_SCRIM_KEY = 'hud-top-scrim'

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
  const panelWidth = widthOverride ?? panelSize.width
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

  const width = ui.button.width * scale
  const height = ui.button.height * scale
  return scene.add
    .rectangle(0, 0, width, height, ui.panel.fill, ui.panel.alpha)
    .setStrokeStyle(ui.panel.strokeThickness, ui.panel.stroke)
}

export const applyMinHitArea = (
  button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle,
  minSize = 44,
): void => {
  const width = Math.max(button.displayWidth, minSize)
  const height = Math.max(button.displayHeight, minSize)
  const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height)
  button.setInteractive({
    hitArea,
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  })
}

export const applyButtonFeedback = (
  button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container,
): void => {
  const baseScaleX = button.scaleX
  const baseScaleY = button.scaleY
  const hoverScaleX = baseScaleX * 1.04
  const hoverScaleY = baseScaleY * 1.04
  const pressScaleX = baseScaleX * 0.98
  const pressScaleY = baseScaleY * 0.98
  let isOver = false

  button.on('pointerover', () => {
    isOver = true
    button.setScale(hoverScaleX, hoverScaleY)
  })
  button.on('pointerout', () => {
    isOver = false
    button.setScale(baseScaleX, baseScaleY)
  })
  button.on('pointerdown', () => {
    button.setScale(pressScaleX, pressScaleY)
  })
  button.on('pointerup', () => {
    button.setScale(isOver ? hoverScaleX : baseScaleX, isOver ? hoverScaleY : baseScaleY)
  })
  button.on('pointerupoutside', () => {
    button.setScale(baseScaleX, baseScaleY)
  })
}

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
 * Creates (or reuses) a programmatic canvas texture that fades from a dark
 * semi-opaque colour at the top to fully transparent at the bottom, then
 * returns it as a full-width Image placed at (0, 0) with origin top-left.
 *
 * The texture is created once per scene session (keyed by HUD_SCRIM_KEY) and
 * reused across hot-reloads / env switches.  It is automatically cleaned up
 * when the Phaser scene is destroyed.
 *
 * @param scene       Owning Phaser scene.
 * @param width       Width of the scrim band in px (should equal game width).
 * @param scrimHeight Height of the gradient in px.
 * @param scrimAlpha  Peak opacity at y=0 (0–1).
 * @param depth       Render depth (default 3.95 — above bg, below UI at 4+).
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
    canvas.width = width
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

// ─── Panel backdrop ───────────────────────────────────────────────────────────

/**
 * Creates a "glass / obsidian" backdrop for overlay panels using Phaser
 * Graphics.  Draws (centred at 0,0) in order:
 *   1. Drop shadow — offset black rounded rect
 *   2. Dark fill — main panel body
 *   3. Teal stroke — thin border matching the theme accent colour
 *
 * Add this as the *first* child in the panel Container so it renders behind
 * the panel sprite / text.
 *
 * @param scene  Owning Phaser scene.
 * @param width  Panel width in px.
 * @param height Panel height in px.
 */
export const createPanelBackdrop = (
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics()
  const r = 8    // corner radius
  const hw = width / 2
  const hh = height / 2

  // 1. Drop shadow (offset right+down)
  g.fillStyle(0x000000, 0.50)
  g.fillRoundedRect(-hw + 4, -hh + 5, width, height, r)

  // 2. Dark obsidian fill
  g.fillStyle(0x07090f, 0.93)
  g.fillRoundedRect(-hw, -hh, width, height, r)

  // 3. Teal accent stroke
  g.lineStyle(2, PALETTE_NUM.panelStroke, 0.80)
  g.strokeRoundedRect(-hw, -hh, width, height, r)

  return g
}
