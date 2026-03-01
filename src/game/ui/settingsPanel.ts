import Phaser from 'phaser'
import { GAME_DIMENSIONS } from '../config'
import type { ThemeDefinition, ThemeUI } from '../theme/types'
import {
  DT_V3,
  DT_COLOR,
  DT_FONT,
  type UIContext,
} from './designTokens'
import { createModalPanel } from './components/Modal'
import { createChip, updateChip, type ChipTone } from './components/Chip'
import { createSecondaryButton } from './components/Button'

type SettingsRow = {
  label: string
  getValue: () => string
  onToggle: () => void
}

export type SettingsPanelHandle = {
  container: Phaser.GameObjects.Container
  updateValues: () => void
  setVisible: (visible: boolean) => void
  isVisible: () => boolean
}

type SettingsPanelOptions = {
  scene: Phaser.Scene
  ui: ThemeUI
  theme: ThemeDefinition
  position: { x: number; y: number }
  rows: SettingsRow[]
  onClose: () => void
  panelHeightOffset?: number
  /** Optional UIContext — when provided its themeUi and tokens are forwarded to factory helpers. */
  ctx?: UIContext
}

export const createSettingsPanel = (options: SettingsPanelOptions): SettingsPanelHandle => {
  const { scene, ui, position, rows, onClose, panelHeightOffset = 0, ctx } = options
  const panelWidth = Math.round(GAME_DIMENSIONS.width * (2 / 3))
  const panelHeight = Math.round(GAME_DIMENSIONS.height * (2 / 3)) + Math.max(0, panelHeightOffset)
  const horizontalPadding = Math.max(18, Math.round(panelWidth * 0.08))
  const rowWidth = panelWidth - horizontalPadding * 2
  const baseLabelFontSize = parseFontSize(ui.statLabelStyle.fontSize, 13)
  const baseRowFontSize = baseLabelFontSize
  const titlePaddingTop = 10
  const titleHintGap = 2
  const hintRowsGap = 6
  const rowsBottomGap = 6
  const bottomPadding = 14
  const hintWrapWidth = panelWidth - 24

  // ── V3 panel (gradient fill + teal rim) ──────────────────────────────────────
  const panelContainer = createModalPanel(scene, panelWidth, panelHeight, ctx)
  panelContainer.setInteractive(
    new Phaser.Geom.Rectangle(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight),
    Phaser.Geom.Rectangle.Contains,
  )
  panelContainer.on(
    'pointerdown',
    (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation()
    },
  )

  // ── Title ────────────────────────────────────────────────────────────────────
  const menuTextScale = 0.85
  const titleStyle = {
    ...ui.overlayTitleStyle,
    fontSize: scaleFontSize(ui.overlayTitleStyle.fontSize, menuTextScale),
    letterSpacing: DT_V3.typography.headlineLetterSpacing,
  }
  const title = scene.add.text(0, 0, 'SETTINGS', titleStyle).setOrigin(0.5, 0.5)
  title.setPosition(0, -panelHeight / 2 + titlePaddingTop)

  // ── Instruction subtitle ─────────────────────────────────────────────────────
  const hint = scene.add
    .text(0, 0, 'Tap a row to toggle. Tap outside to close.', {
      fontFamily:      DT_FONT.body,
      fontSize:        DT_V3.typography.instructionSize,
      color:           DT_COLOR.textMuted,
      stroke:          DT_COLOR.strokeBg,
      strokeThickness: 1,
      align:           'center',
      wordWrap:        { width: hintWrapWidth },
    })
    .setOrigin(0.5, 0.5)
    .setAlpha(0.78)
  hint.setPosition(0, title.y + title.height / 2 + titleHintGap + hint.height / 2)

  // ── Row layout geometry ──────────────────────────────────────────────────────
  const rowsTop = hint.y + hint.height / 2 + hintRowsGap
  const closeButtonY = panelHeight / 2 - bottomPadding
  const rowsBottom = closeButtonY - rowsBottomGap
  const rowsAreaHeight = Math.max(0, rowsBottom - rowsTop)
  const minRowHeight = 18
  let targetVisibleRows = Math.min(rows.length, 6)
  let targetRowHeight = Math.floor(rowsAreaHeight / Math.max(1, targetVisibleRows))
  if (targetVisibleRows > 5 && targetRowHeight < minRowHeight) {
    targetVisibleRows = 5
    targetRowHeight = Math.floor(rowsAreaHeight / Math.max(1, targetVisibleRows))
  }
  const rowHeight = Math.max(minRowHeight, targetRowHeight)
  const extraGap = Math.max(
    0,
    Math.floor(
      (rowsAreaHeight - rowHeight * targetVisibleRows) / Math.max(1, targetVisibleRows - 1),
    ),
  )
  const rowGap = rowHeight + extraGap
  const rowsHeight = rowHeight + (rows.length - 1) * rowGap
  const rowsOverflow = rowsHeight - rowsAreaHeight
  const rowStartY =
    rowsTop + rowHeight / 2 + (rowsOverflow > 0 ? 0 : Math.max(0, (rowsAreaHeight - rowsHeight) / 2))
  const badgeRightX = rowWidth / 2 - 4
  const rowTextScaleBase =
    rowHeight < baseRowFontSize + 2
      ? Math.min(1, Math.max(0.6, (rowHeight - 4) / baseRowFontSize))
      : 1
  const rowTextScale = Math.max(0.55, Math.min(0.9, rowTextScaleBase * menuTextScale))
  const maxLabelFontSize = Math.floor(rowHeight * 0.6)
  const labelStyle = {
    ...ui.statLabelStyle,
    fontSize: clampFontSize(scaleFontSize(ui.statLabelStyle.fontSize, rowTextScale), maxLabelFontSize),
  }

  // ── Rows state ───────────────────────────────────────────────────────────────
  let rowIndex = 0
  const valueChips: Phaser.GameObjects.Container[] = []
  let settingsPanel: Phaser.GameObjects.Container
  const rowsContainer = scene.add.container(0, 0)
  const maxScroll = Math.max(0, rowsHeight - rowsAreaHeight)
  let scrollOffset = 0
  let dragPointerId: number | null = null
  let dragStartY = 0
  let dragStartOffset = 0
  let dragMoved = false
  const dragThreshold = 6

  const isPointerInRowsArea = (pointer: Phaser.Input.Pointer): boolean => {
    const x = pointer.worldX ?? pointer.x
    const y = pointer.worldY ?? pointer.y
    const left   = position.x - rowWidth / 2
    const right  = position.x + rowWidth / 2
    const top    = position.y + rowsTop
    const bottom = position.y + rowsBottom
    return x >= left && x <= right && y >= top && y <= bottom
  }

  const applyScroll = (value: number): void => {
    scrollOffset = Phaser.Math.Clamp(value, 0, maxScroll)
    rowsContainer.y = -scrollOffset
  }

  const resolveBadgeTone = (value: string): ChipTone => {
    const upper = value.trim().toUpperCase()
    if (upper === 'ON')  return 'on'
    if (upper === 'OFF') return 'off'
    return 'neutral'
  }

  // ── Row factory ──────────────────────────────────────────────────────────────

  const createRow = (row: SettingsRow): void => {
    const y = rowStartY + rowIndex * rowGap
    rowIndex += 1

    // Teal hover highlight (replaces old shadow-coloured highlight)
    const hit = scene.add
      .rectangle(0, y, rowWidth, rowHeight, DT_COLOR.accentTealNum, 0)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerover',     () => hit.setFillStyle(DT_COLOR.accentTealNum, 0.06))
    hit.on('pointerout',      () => hit.setFillStyle(DT_COLOR.accentTealNum, 0))
    hit.on('pointerupoutside',() => hit.setFillStyle(DT_COLOR.accentTealNum, 0))
    hit.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (!isPointerInRowsArea(_pointer)) return
        event.stopPropagation()
        hit.setFillStyle(DT_COLOR.accentTealNum, 0.12)
      },
    )
    hit.on(
      'pointerup',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (!isPointerInRowsArea(_pointer)) return
        event.stopPropagation()
        hit.setFillStyle(DT_COLOR.accentTealNum, 0)
        if (!dragMoved) row.onToggle()
      },
    )

    // Label
    const labelText = scene.add
      .text(-rowWidth / 2 + 6, y, row.label, labelStyle)
      .setOrigin(0, 0.5)

    // Value chip (right-aligned)
    const value = row.getValue()
    const chip = createChip(scene, value, resolveBadgeTone(value), ctx)
    chip.setPosition(badgeRightX - DT_V3.chip.minWidth / 2, y)

    valueChips.push(chip)
    rowsContainer.add([hit, labelText, chip])
  }

  // ── Assemble container ───────────────────────────────────────────────────────
  const items: Phaser.GameObjects.GameObject[] = [panelContainer, title, hint, rowsContainer]
  settingsPanel = scene.add.container(position.x, position.y, items)
  settingsPanel.setDepth(6)
  settingsPanel.setVisible(false)

  // Scroll mask for rows area
  if (rowsAreaHeight > 0) {
    const rowsMask = scene.add.graphics()
    rowsMask.fillStyle(0xffffff, 1)
    rowsMask.fillRect(position.x - rowWidth / 2, position.y + rowsTop, rowWidth, rowsAreaHeight)
    rowsMask.setVisible(false)
    rowsContainer.setMask(rowsMask.createGeometryMask())
  }

  rows.forEach((row) => createRow(row))
  applyScroll(0)

  // ── Close button ─────────────────────────────────────────────────────────────
  const closeButton = createSecondaryButton(scene, 'CLOSE', onClose, ctx)
  closeButton.setPosition(0, closeButtonY)
  settingsPanel.add(closeButton)

  // ── Scroll / drag input ───────────────────────────────────────────────────────
  const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!settingsPanel.visible || maxScroll <= 0) return
    if (!isPointerInRowsArea(pointer)) return
    dragPointerId  = pointer.id
    dragStartY     = pointer.worldY ?? pointer.y
    dragStartOffset = scrollOffset
    dragMoved      = false
  }

  const handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!settingsPanel.visible || maxScroll <= 0) return
    if (dragPointerId !== pointer.id) return
    const currentY = pointer.worldY ?? pointer.y
    const delta    = currentY - dragStartY
    if (Math.abs(delta) > dragThreshold) dragMoved = true
    if (dragMoved) applyScroll(dragStartOffset - delta)
  }

  const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (dragPointerId === pointer.id) dragPointerId = null
  }

  const handleWheel = (
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (!settingsPanel.visible || maxScroll <= 0) return
    if (!isPointerInRowsArea(pointer)) return
    applyScroll(scrollOffset + deltaY * 0.45)
  }

  scene.input.on('pointerdown', handlePointerDown)
  scene.input.on('pointermove', handlePointerMove)
  scene.input.on('pointerup',   handlePointerUp)
  scene.input.on('wheel',       handleWheel)

  // ── Public handle ─────────────────────────────────────────────────────────────
  const updateValues = (): void => {
    for (let i = 0; i < rows.length; i += 1) {
      const value = rows[i].getValue()
      updateChip(valueChips[i], value, resolveBadgeTone(value))
    }
  }

  return {
    container:  settingsPanel,
    updateValues,
    setVisible: (visible: boolean) => settingsPanel.setVisible(visible),
    isVisible:  () => settingsPanel.visible,
  }
}

// ─── Font helpers ─────────────────────────────────────────────────────────────

const scaleFontSize = (value: string, multiplier: number): string => {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/)
  if (!match) return value
  const next = Math.max(10, Math.round(Number(match[1]) * multiplier))
  return `${next}px`
}

const clampFontSize = (value: string, maxPx: number): string => {
  const current = parseFontSize(value, 10)
  const clamped = Math.max(10, Math.min(current, Math.floor(maxPx)))
  return `${clamped}px`
}

const parseFontSize = (value: string, fallback: number): number => {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/)
  if (!match) return fallback
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : fallback
}
