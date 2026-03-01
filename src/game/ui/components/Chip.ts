/**
 * Chip.ts — v3 value chip factory.
 *
 * A "chip" is the small labelled badge used in the Settings modal to show
 * the current value of a toggle row (e.g. "OFF", "FULL", "ASK").
 *
 * Three tonal variants:
 *   on      — feature enabled: stronger fill + rim
 *   off     — feature disabled: dim fill + rim
 *   neutral — non-binary value (e.g. level/mode): middle alpha
 *
 * Usage:
 *   const chip = createChip(scene, 'OFF', 'off')
 *   container.add(chip)
 *   ...later...
 *   updateChip(chip, 'FULL', 'on')
 */

import Phaser from 'phaser'
import {
  DT_V3,
  DT_COLOR,
  DT_BADGE,
  DT_FONT,
  DT_STROKE,
  type UIContext,
} from '../designTokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChipTone = 'on' | 'off' | 'neutral'

// Fixed child indices inside the chip Container
const IDX_GRAPHICS = 0
const IDX_TEXT     = 1

// ─── Internal helpers ─────────────────────────────────────────────────────────

function chipFillAlpha(tone: ChipTone): number {
  if (tone === 'on')      return DT_BADGE.fillOn
  if (tone === 'off')     return DT_BADGE.fillOff
  return DT_BADGE.fillNeutral
}

function chipStrokeAlpha(tone: ChipTone): number {
  if (tone === 'on')      return DT_BADGE.strokeOn
  if (tone === 'off')     return DT_BADGE.strokeOff
  return DT_BADGE.strokeNeutral
}

function chipTextColor(tone: ChipTone): string {
  // ON  → accent teal bright
  // OFF → muted
  // neutral → primary
  if (tone === 'on')  return DT_COLOR.tealBright
  if (tone === 'off') return DT_COLOR.textMuted
  return DT_COLOR.textPrimary
}

function chipWidth(textWidth: number): number {
  return Math.max(
    DT_V3.chip.minWidth,
    textWidth + DT_V3.chip.paddingX * 2,
  )
}

function drawChipBg(
  g: Phaser.GameObjects.Graphics,
  textWidth: number,
  tone: ChipTone,
): void {
  const w  = chipWidth(textWidth)
  const h  = DT_V3.chip.height
  const r  = DT_V3.chip.radius
  const hw = w / 2
  const hh = h / 2

  g.clear()

  // Fill
  g.fillStyle(DT_COLOR.panelFill, chipFillAlpha(tone))
  g.fillRoundedRect(-hw, -hh, w, h, r)

  // Teal stroke
  g.lineStyle(DT_STROKE.thin, DT_COLOR.accentTealNum, chipStrokeAlpha(tone))
  g.strokeRoundedRect(-hw, -hh, w, h, r)
}

function chipTextStyle(tone: ChipTone, _ctx?: UIContext): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily:      DT_FONT.body,
    fontSize:        '11px',
    color:           chipTextColor(tone),
    stroke:          DT_COLOR.strokeBg,
    strokeThickness: 1,
    align:           'center',
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new chip Container centred at (0,0).
 * The container has exactly two children: [Graphics, Text].
 */
export const createChip = (
  scene: Phaser.Scene,
  value: string,
  tone:  ChipTone,
  ctx?:  UIContext,
): Phaser.GameObjects.Container => {
  const txt = scene.add
    .text(0, 0, value, chipTextStyle(tone, ctx))
    .setOrigin(0.5, 0.5)

  const g = scene.add.graphics()
  drawChipBg(g, txt.width, tone)

  return scene.add.container(0, 0, [g, txt])
}

/**
 * Updates an existing chip Container in-place (no reallocation).
 * Call this instead of recreating chips during value refreshes.
 */
export const updateChip = (
  chip:  Phaser.GameObjects.Container,
  value: string,
  tone:  ChipTone,
): void => {
  const g   = chip.getAt(IDX_GRAPHICS) as Phaser.GameObjects.Graphics
  const txt = chip.getAt(IDX_TEXT)     as Phaser.GameObjects.Text

  txt.setStyle(chipTextStyle(tone))
  txt.setText(value)
  drawChipBg(g, txt.width, tone)
}
