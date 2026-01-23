import Phaser from 'phaser'
import type { ThemeDefinition, ThemeUI } from '../theme/types'
import { createPanel, createSmallButton } from './uiFactory'

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
}

export const createSettingsPanel = (options: SettingsPanelOptions): SettingsPanelHandle => {
  const { scene, ui, theme, position, rows, onClose, panelHeightOffset = 20 } = options
  const panelScale = 0.68
  const textScale = 0.66
  const panelWidth = Math.round(ui.panelSize.large.width * panelScale)
  const rowWidth = panelWidth - Math.round(48 * panelScale)
  const labelFontSize = parseFontSize(scaleFontSize(ui.statLabelStyle.fontSize, textScale), 13)
  const valueFontSize = parseFontSize(scaleFontSize(ui.statValueStyle.fontSize, textScale), 15)
  const rowFontSize = Math.max(labelFontSize, valueFontSize)
  const rowHeight = Math.max(40, Math.round(rowFontSize * 1.4))
  const rowGap = Math.round(rowHeight * 0.95)
  const badgeHeight = Math.max(18, rowHeight - 9)
  const badgeRightX = rowWidth / 2 - 6
  const badgeMinWidth = 50
  const badgePaddingX = 11
  const labelValueGap = Math.round(9 * panelScale)
  const headerHeight = Math.max(84, Math.round(rowHeight * 1.7))
  const footerHeight = Math.max(56, Math.round(rowHeight * 1.15))
  const basePanelHeight = Math.round(ui.panelSize.large.height * panelScale) + Math.round(panelHeightOffset * panelScale)
  const rowsHeight = rowHeight + (rows.length - 1) * rowGap
  const minPanelHeight = headerHeight + footerHeight + rowHeight
  const panelHeight = Math.max(basePanelHeight, minPanelHeight)

  const panel = createPanel(scene, ui, theme, 'large', panelWidth, panelHeight)
  panel.setInteractive()
  panel.on(
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

  const titleY = -panelHeight / 2 + Math.round(32 * panelScale)
  const titleStyle = {
    ...ui.overlayTitleStyle,
    fontSize: scaleFontSize(ui.overlayTitleStyle.fontSize, textScale),
  }
  const title = scene.add.text(0, titleY, 'SETTINGS', titleStyle).setOrigin(0.5, 0.5)

  const hintStyle = {
    ...ui.overlayBodyStyle,
    fontSize: scaleFontSize(ui.overlayBodyStyle.fontSize, 0.6),
  }
  const hint = scene.add
    .text(0, titleY + Math.round(22 * panelScale), 'Tap a row to toggle. Tap outside to close.', hintStyle)
    .setOrigin(0.5, 0.5)
  hint.setWordWrapWidth(panelWidth - Math.round(60 * panelScale))
  hint.setLineSpacing(Math.round(3 * panelScale))
  hint.setAlpha(0.82)

  const labelStyle = {
    ...ui.statLabelStyle,
    fontSize: scaleFontSize(ui.statLabelStyle.fontSize, textScale),
  }
  const valueStyle = {
    ...ui.statValueStyle,
    fontSize: scaleFontSize(ui.statValueStyle.fontSize, textScale),
  }

  let rowIndex = 0
  const valueTexts: Phaser.GameObjects.Text[] = []
  const valueBadges: Phaser.GameObjects.Rectangle[] = []
  const valueMaxWidths: number[] = []
  let settingsPanel: Phaser.GameObjects.Container

  const rowsTop = hint.y + hint.height / 2 + Math.round(14 * panelScale)
  const closeButtonY = panelHeight / 2 - Math.round(20 * panelScale)
  const rowsBottom = closeButtonY - Math.round(20 * panelScale)
  const rowsAreaHeight = Math.max(0, rowsBottom - rowsTop)
  const rowsOverflow = rowsHeight - rowsAreaHeight
  const rowStartY =
    rowsTop + rowHeight / 2 + (rowsOverflow > 0 ? 0 : Math.max(0, (rowsAreaHeight - rowsHeight) / 2))
  const rowsContainer = scene.add.container(0, 0)
  const maxScroll = Math.max(0, rowsHeight - rowsAreaHeight)
  let scrollOffset = 0
  let dragPointerId: number | null = null
  let dragStartY = 0
  let dragStartOffset = 0
  let dragMoved = false
  const dragThreshold = Math.max(4, Math.round(6 * panelScale))

  const isPointerInRowsArea = (pointer: Phaser.Input.Pointer): boolean => {
    const x = pointer.worldX ?? pointer.x
    const y = pointer.worldY ?? pointer.y
    const left = position.x - rowWidth / 2
    const right = position.x + rowWidth / 2
    const top = position.y + rowsTop
    const bottom = position.y + rowsBottom
    return x >= left && x <= right && y >= top && y <= bottom
  }

  const applyScroll = (value: number): void => {
    scrollOffset = Phaser.Math.Clamp(value, 0, maxScroll)
    rowsContainer.y = -scrollOffset
  }

  const resolveBadgeTone = (value: string): 'on' | 'off' | 'neutral' => {
    const upper = value.trim().toUpperCase()
    if (upper === 'ON') {
      return 'on'
    }
    if (upper === 'OFF') {
      return 'off'
    }
    return 'neutral'
  }

  const getBadgeFill = (tone: 'on' | 'off' | 'neutral'): number => {
    if (tone === 'on') {
      return theme.paletteNum.panelStroke
    }
    if (tone === 'off') {
      return theme.paletteNum.shadow
    }
    return theme.paletteNum.panel
  }

  const getBadgeAlpha = (tone: 'on' | 'off' | 'neutral'): number => {
    if (tone === 'on') {
      return 0.22
    }
    if (tone === 'off') {
      return 0.18
    }
    return 0.2
  }

  const getBadgeStrokeAlpha = (tone: 'on' | 'off' | 'neutral'): number => {
    if (tone === 'on') {
      return 0.7
    }
    if (tone === 'off') {
      return 0.4
    }
    return 0.55
  }

  const computeBadgeWidth = (
    text: Phaser.GameObjects.Text,
    minWidth: number,
    maxWidth: number,
  ): number => {
    if (maxWidth <= 0) {
      return 0
    }
    const targetWidth = Math.max(minWidth, text.width + badgePaddingX * 2)
    return Math.min(maxWidth, targetWidth)
  }

  const fitValueText = (
    text: Phaser.GameObjects.Text,
    value: string,
    maxWidth: number,
  ): string => {
    if (maxWidth <= 0) {
      text.setText('')
      return ''
    }
    text.setText(value)
    if (text.width <= maxWidth) {
      return value
    }
    let trimmed = value
    while (trimmed.length > 3) {
      trimmed = trimmed.slice(0, -1)
      const candidate = `${trimmed}...`
      text.setText(candidate)
      if (text.width <= maxWidth) {
        return candidate
      }
    }
    text.setText(value)
    return value
  }

  const applyBadgeStyle = (
    badge: Phaser.GameObjects.Rectangle,
    valueText: Phaser.GameObjects.Text,
    value: string,
  ): void => {
    const tone = resolveBadgeTone(value)
    badge.setFillStyle(getBadgeFill(tone), getBadgeAlpha(tone))
    badge.setStrokeStyle(1, theme.paletteNum.panelStroke, getBadgeStrokeAlpha(tone))
    if (tone === 'off') {
      valueText.setColor(ui.statLabelStyle.color)
    } else {
      valueText.setColor(ui.statValueStyle.color)
    }
  }

  const layoutValue = (
    valueText: Phaser.GameObjects.Text,
    badge: Phaser.GameObjects.Rectangle,
    value: string,
    maxBadgeWidth: number,
  ): void => {
    if (maxBadgeWidth <= 0) {
      valueText.setText('')
      badge.setSize(0, badgeHeight)
      badge.setPosition(badgeRightX, valueText.y)
      return
    }
    const maxValueWidth = Math.max(0, maxBadgeWidth - badgePaddingX * 2)
    const displayValue = fitValueText(valueText, value, maxValueWidth)
    const minBadgeWidth = Math.min(badgeMinWidth, maxBadgeWidth)
    const badgeWidth = computeBadgeWidth(valueText, minBadgeWidth, maxBadgeWidth)
    const badgeX = badgeRightX - badgeWidth / 2
    badge.setSize(badgeWidth, badgeHeight)
    badge.setPosition(badgeX, valueText.y)
    const valueInset = Math.min(badgePaddingX, Math.max(2, maxBadgeWidth / 2))
    valueText.setPosition(badgeRightX - valueInset, valueText.y)
    applyBadgeStyle(badge, valueText, displayValue)
  }

  const createRow = (row: SettingsRow): void => {
    const y = rowStartY + rowIndex * rowGap
    rowIndex += 1

    const highlightColor = theme.paletteNum.shadow ?? 0x000000
    const hit = scene.add
      .rectangle(0, y, rowWidth, rowHeight, highlightColor, 0)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerover', () => hit.setFillStyle(highlightColor, 0.18))
    hit.on('pointerout', () => hit.setFillStyle(highlightColor, 0))
    hit.on('pointerupoutside', () => hit.setFillStyle(highlightColor, 0))
    hit.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (!isPointerInRowsArea(_pointer)) {
          return
        }
        event.stopPropagation()
        hit.setFillStyle(highlightColor, 0.28)
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
        if (!isPointerInRowsArea(_pointer)) {
          return
        }
        event.stopPropagation()
        hit.setFillStyle(highlightColor, 0)
        if (!dragMoved) {
          row.onToggle()
        }
      },
    )

    const labelText = scene.add.text(-rowWidth / 2 + 4, y, row.label, labelStyle).setOrigin(0, 0.5)
    const valueText = scene.add.text(0, y, row.getValue(), valueStyle).setOrigin(1, 0.5)
    const labelRightX = labelText.x + labelText.width
    const maxBadgeWidth = Math.max(0, badgeRightX - labelRightX - labelValueGap)
    const initialBadgeWidth = Math.min(badgeMinWidth, maxBadgeWidth)
    const badge = scene.add.rectangle(
      badgeRightX - initialBadgeWidth / 2,
      y,
      initialBadgeWidth,
      badgeHeight,
      theme.paletteNum.panel,
      0.2,
    )
    layoutValue(valueText, badge, row.getValue(), maxBadgeWidth)

    valueTexts.push(valueText)
    valueBadges.push(badge)
    valueMaxWidths.push(maxBadgeWidth)
    rowsContainer.add([hit, labelText, badge, valueText])
  }

  const items: Phaser.GameObjects.GameObject[] = [panel, title, hint, rowsContainer]
  settingsPanel = scene.add.container(position.x, position.y, items)
  settingsPanel.setDepth(6)
  settingsPanel.setVisible(false)

  if (rowsAreaHeight > 0) {
    const rowsMask = scene.add.graphics()
    rowsMask.fillStyle(0xffffff, 1)
    rowsMask.fillRect(position.x - rowWidth / 2, position.y + rowsTop, rowWidth, rowsAreaHeight)
    rowsMask.setVisible(false)
    rowsContainer.setMask(rowsMask.createGeometryMask())
  }

  rows.forEach((row) => createRow(row))
  applyScroll(0)

  const closeButton = createSmallButton(scene, ui, theme, 'CLOSE', onClose)
  closeButton.setPosition(0, closeButtonY)
  settingsPanel.add(closeButton)

  const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!settingsPanel.visible || maxScroll <= 0) {
      return
    }
    if (!isPointerInRowsArea(pointer)) {
      return
    }
    dragPointerId = pointer.id
    dragStartY = pointer.worldY ?? pointer.y
    dragStartOffset = scrollOffset
    dragMoved = false
  }

  const handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!settingsPanel.visible || maxScroll <= 0) {
      return
    }
    if (dragPointerId !== pointer.id) {
      return
    }
    const currentY = pointer.worldY ?? pointer.y
    const delta = currentY - dragStartY
    if (Math.abs(delta) > dragThreshold) {
      dragMoved = true
    }
    if (dragMoved) {
      applyScroll(dragStartOffset - delta)
    }
  }

  const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (dragPointerId === pointer.id) {
      dragPointerId = null
    }
  }

  const handleWheel = (
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (!settingsPanel.visible || maxScroll <= 0) {
      return
    }
    if (!isPointerInRowsArea(pointer)) {
      return
    }
    applyScroll(scrollOffset + deltaY * 0.45)
  }

  scene.input.on('pointerdown', handlePointerDown)
  scene.input.on('pointermove', handlePointerMove)
  scene.input.on('pointerup', handlePointerUp)
  scene.input.on('wheel', handleWheel)

  const updateValues = (): void => {
    for (let i = 0; i < rows.length; i += 1) {
      const value = rows[i].getValue()
      const valueText = valueTexts[i]
      const badge = valueBadges[i]
      layoutValue(valueText, badge, value, valueMaxWidths[i])
    }
  }

  return {
    container: settingsPanel,
    updateValues,
    setVisible: (visible: boolean) => settingsPanel.setVisible(visible),
    isVisible: () => settingsPanel.visible,
  }
}

const scaleFontSize = (value: string, multiplier: number): string => {
  const match = value.match(/^(\\d+(?:\\.\\d+)?)px$/)
  if (!match) {
    return value
  }
  const next = Math.max(10, Math.round(Number(match[1]) * multiplier))
  return `${next}px`
}

const parseFontSize = (value: string, fallback: number): number => {
  const match = value.match(/^(\\d+(?:\\.\\d+)?)px$/)
  if (!match) {
    return fallback
  }
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : fallback
}
