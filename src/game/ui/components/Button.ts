/**
 * Button.ts — v3 button factories.
 *
 * Two variants:
 *   createPrimaryButton   — full-height CTA (PLAY AGAIN). Fully rounded ends,
 *                           bright teal rim, optional left icon.
 *   createSecondaryButton — compact action button (HOME, SHARE, CLOSE).
 *                           Same obsidian fill, dimmer rim.
 *
 * Both reuse applyMinHitArea and applyButtonFeedback from uiFactory.ts.
 * The returned Container has setInteractive called on the backdrop Graphics
 * so standard Phaser pointer events bubble correctly.
 */

import Phaser from 'phaser'
import { applyButtonFeedback } from '../uiFactory'
import {
  DT_V3,
  DT_COLOR,
  DT_SHADOW,
  DT_STROKE,
  DT_FONT,
  type UIContext,
} from '../designTokens'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const OBS_MID = 0x0e1220  // slightly lighter obsidian for buttons

function drawButtonBg(
  g:      Phaser.GameObjects.Graphics,
  width:  number,
  height: number,
  radius: number,
  rimAlpha: number,
): void {
  const hw = width  / 2
  const hh = height / 2
  const sh = DT_SHADOW.capsuleShadow

  g.clear()

  // Shadow
  g.fillStyle(sh.color, sh.alpha)
  g.fillRoundedRect(-hw + sh.offsetX, -hh + sh.offsetY, width, height, radius)

  // Obsidian fill
  g.fillStyle(OBS_MID, DT_COLOR.panelFillAlpha)
  g.fillRoundedRect(-hw, -hh, width, height, radius)

  // Teal rim
  g.lineStyle(DT_STROKE.normal, DT_COLOR.accentTealNum, rimAlpha)
  g.strokeRoundedRect(-hw, -hh, width, height, radius)
}

function makeInteractive(
  g:      Phaser.GameObjects.Graphics,
  width:  number,
  height: number,
): void {
  g.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  )
  // Ensure hand cursor on desktop
  g.input!.cursor = 'pointer'
}

// ─── Primary button ───────────────────────────────────────────────────────────

/**
 * Full-height primary CTA button (e.g. PLAY AGAIN).
 *
 * @param scene      Phaser scene
 * @param label      Button label text
 * @param width      Total button width
 * @param atlasKey   Atlas texture key for icon (null = no icon)
 * @param iconFrame  Atlas frame name for icon (null = no icon)
 * @param onClick    Click callback — stopPropagation is called automatically
 * @param _ctx       UIContext (reserved for theme overrides)
 */
export const createPrimaryButton = (
  scene:      Phaser.Scene,
  label:      string,
  width:      number,
  atlasKey:   string | null,
  iconFrame:  string | null,
  onClick:    () => void,
  _ctx?:      UIContext,
): Phaser.GameObjects.Container => {
  const h = DT_V3.button.primaryH
  const r = DT_V3.button.primaryRadius

  const g = scene.add.graphics()
  drawButtonBg(g, width, h, r, DT_SHADOW.rimAlpha.full)
  makeInteractive(g, width, h)

  const items: Phaser.GameObjects.GameObject[] = [g]

  // Icon
  let iconW = 0
  if (atlasKey && iconFrame && scene.textures.exists(atlasKey)) {
    const icon = scene.add.image(0, 0, atlasKey, iconFrame).setOrigin(0.5, 0.5)
    iconW = icon.displayWidth + DT_V3.button.iconGap
    items.push(icon)
  }

  // Label
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily:      DT_FONT.body,
      fontSize:        '15px',
      color:           DT_COLOR.textPrimary,
      stroke:          DT_COLOR.strokeBg,
      strokeThickness: 2,
      align:           'center',
    })
    .setOrigin(0.5, 0.5)
  items.push(txt)

  // Centre icon+label pair horizontally
  if (iconW > 0) {
    const totalW  = iconW + txt.width
    const startX  = -(totalW / 2)
    const iconObj = items[1] as Phaser.GameObjects.Image
    iconObj.setX(startX + iconObj.displayWidth / 2)
    txt.setX(startX + iconW + txt.width / 2)
  }

  const container = scene.add.container(0, 0, items)

  g.on(
    'pointerdown',
    (
      _ptr:    Phaser.Input.Pointer,
      _lx:     number,
      _ly:     number,
      event:   Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation()
      onClick()
    },
  )

  applyButtonFeedback(container)

  return container
}

// ─── Secondary button ─────────────────────────────────────────────────────────

/**
 * Compact secondary button (HOME, SHARE, CLOSE, etc.).
 * Width is derived from label text length.
 */
export const createSecondaryButton = (
  scene:    Phaser.Scene,
  label:    string,
  onClick:  () => void,
  _ctx?:    UIContext,
): Phaser.GameObjects.Container => {
  const h = DT_V3.button.secondaryH
  const r = DT_V3.button.secondaryRadius

  // Measure text first to size the button
  const measureTxt = scene.add
    .text(0, 0, label, {
      fontFamily: DT_FONT.body,
      fontSize:   '13px',
      color:      DT_COLOR.textPrimary,
    })
    .setVisible(false)
  const w = Math.max(80, measureTxt.width + 32)
  measureTxt.destroy()

  const g = scene.add.graphics()
  drawButtonBg(g, w, h, r, DT_SHADOW.rimAlpha.muted)
  makeInteractive(g, w, h)

  const txt = scene.add
    .text(0, 0, label, {
      fontFamily:      DT_FONT.body,
      fontSize:        '13px',
      color:           DT_COLOR.textPrimary,
      stroke:          DT_COLOR.strokeBg,
      strokeThickness: 2,
      align:           'center',
    })
    .setOrigin(0.5, 0.5)

  const container = scene.add.container(0, 0, [g, txt])

  g.on(
    'pointerdown',
    (
      _ptr:  Phaser.Input.Pointer,
      _lx:   number,
      _ly:   number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation()
      onClick()
    },
  )

  applyButtonFeedback(container)

  return container
}
