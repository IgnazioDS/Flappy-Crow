/**
 * Modal.ts — v3 modal panel factory.
 *
 * createModalPanel() builds the "Obsidian Glass + Teal Rim v3" panel:
 *   1. Drop shadow (offset filled rect)
 *   2. Outer glow (wide dim teal stroke)
 *   3. Canvas gradient fill (top-lighter → bottom-darker, cached by size)
 *   4. Inner top-edge highlight
 *   5. Teal rim stroke
 *   6. Optional NineSlice frame overlay for pixel-crisp SVG corners
 *
 * The gradient fill is a canvas texture created once per unique size and
 * reused on subsequent calls (same approach as createHudTopScrim).
 * The NineSlice border overlay is added only when the 'ui_v3_panel_frame'
 * texture has been successfully loaded by BootScene.
 */

import Phaser from 'phaser'
import {
  DT_V3,
  DT_COLOR,
  DT_SHADOW,
  DT_STROKE,
  type UIContext,
} from '../designTokens'

// ─── Gradient texture cache ───────────────────────────────────────────────────

const GRADIENT_CACHE = new Set<string>()

function ensureGradientTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
): void {
  if (GRADIENT_CACHE.has(key) && scene.textures.exists(key)) return

  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0,    DT_V3.panel.gradientTop)
    grad.addColorStop(0.4,  DT_V3.panel.gradientMid)
    grad.addColorStop(1,    DT_V3.panel.gradientBot)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }

  scene.textures.addCanvas(key, canvas)
  GRADIENT_CACHE.add(key)
}

// ─── Main factory ─────────────────────────────────────────────────────────────

/**
 * Creates a layered obsidian-glass v3 panel Container centred at (0,0).
 *
 * The container holds (in z-order):
 *   [0] g_under  — shadow + outer glow Graphics
 *   [1] fill     — canvas gradient Image
 *   [2] g_over   — inner highlight + teal rim Graphics
 *   [3] frame?   — NineSlice frame overlay (present when texture loaded)
 *
 * @param scene   Phaser scene
 * @param width   Panel width in pixels
 * @param height  Panel height in pixels
 * @param _ctx    UIContext (reserved for future theme overrides)
 */
export const createModalPanel = (
  scene:  Phaser.Scene,
  width:  number,
  height: number,
  _ctx?:  UIContext,
): Phaser.GameObjects.Container => {
  const r  = DT_V3.panel.radius
  const hw = width  / 2
  const hh = height / 2

  // ── Layer 1: shadow + outer glow ────────────────────────────────────────────
  const g_under = scene.add.graphics()

  // 1a. Drop shadow
  const sh = DT_SHADOW.panelShadow
  g_under.fillStyle(sh.color, sh.alpha)
  g_under.fillRoundedRect(
    -hw + sh.offsetX,
    -hh + sh.offsetY,
    width, height, r,
  )

  // 1b. Outer glow (wide dim teal stroke layered beneath the rim)
  g_under.lineStyle(
    DT_STROKE.normal + DT_V3.panel.rimGlowSpread,
    DT_COLOR.accentTealNum,
    DT_V3.panel.rimGlowAlpha,
  )
  g_under.strokeRoundedRect(-hw, -hh, width, height, r)

  // ── Layer 2: gradient fill ───────────────────────────────────────────────────
  const gradKey = `modal_grad_${width}x${height}`
  ensureGradientTexture(scene, gradKey, width, height)
  const fill = scene.add.image(0, 0, gradKey)

  // ── Layer 3: inner highlight + teal rim ─────────────────────────────────────
  const g_over = scene.add.graphics()

  // 3a. Inner top-edge highlight strip
  g_over.fillStyle(DT_SHADOW.innerHighlight.color, DT_V3.panel.innerHighlightAlpha)
  g_over.fillRoundedRect(
    -hw, -hh,
    width, DT_V3.panel.innerHighlightH,
    { tl: r, tr: r, bl: 0, br: 0 },
  )

  // 3b. Teal rim stroke
  g_over.lineStyle(DT_STROKE.normal, DT_COLOR.accentTealNum, DT_V3.panel.rimAlpha)
  g_over.strokeRoundedRect(-hw, -hh, width, height, r)

  // ── Layer 4: NineSlice frame overlay (optional) ──────────────────────────────
  const items: Phaser.GameObjects.GameObject[] = [g_under, fill, g_over]

  if (scene.textures.exists('ui_v3_panel_frame')) {
    const frame = scene.add.nineslice(
      0, 0,
      'ui_v3_panel_frame',
      undefined,
      width, height,
      16, 16, 16, 16,
    )
    items.push(frame)
  }

  return scene.add.container(0, 0, items)
}
