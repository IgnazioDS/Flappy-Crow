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
  const panelScale = 0.9
  const textScale = 0.9
  const panelWidth = Math.round(ui.panelSize.large.width * panelScale)
  const rowWidth = panelWidth - Math.round(56 * panelScale)
  const labelFontSize = parseFontSize(scaleFontSize(ui.statLabelStyle.fontSize, textScale), 14)
  const valueFontSize = parseFontSize(scaleFontSize(ui.statValueStyle.fontSize, textScale), 16)
  const rowFontSize = Math.max(labelFontSize, valueFontSize)
  const rowHeight = Math.max(44, Math.round(rowFontSize * 1.5))
  const rowGap = Math.round(rowHeight * 1.05)
  const badgeHeight = Math.max(18, rowHeight - 8)
  const badgeRightX = rowWidth / 2 - 6
  const badgeMinWidth = 54
  const badgePaddingX = 12
  const headerHeight = 72
  const footerHeight = 52
  const basePanelHeight = Math.round(ui.panelSize.large.height * panelScale) + Math.round(panelHeightOffset * panelScale)
  const rowsHeight = rowHeight + (rows.length - 1) * rowGap
  const panelHeight = Math.max(basePanelHeight, rowsHeight + headerHeight + footerHeight)

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
    ...ui.statLabelStyle,
    fontSize: scaleFontSize(ui.statLabelStyle.fontSize, 0.78),
  }
  const hint = scene.add
    .text(0, titleY + Math.round(24 * panelScale), 'Tap a row to toggle. Tap outside to close.', hintStyle)
    .setOrigin(0.5, 0.5)
  hint.setWordWrapWidth(panelWidth - Math.round(72 * panelScale))

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
  let settingsPanel: Phaser.GameObjects.Container

  const rowsTop = titleY + Math.round(44 * panelScale)
  const closeButtonY = panelHeight / 2 - Math.round(16 * panelScale)
  const rowsBottom = closeButtonY - Math.round(24 * panelScale)
  const rowsAreaHeight = rowsBottom - rowsTop
  const rowStartY =
    rowsTop + rowHeight / 2 + Math.max(0, (rowsAreaHeight - rowsHeight) / 2)

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

  const computeBadgeWidth = (text: Phaser.GameObjects.Text): number =>
    Math.max(badgeMinWidth, text.width + badgePaddingX * 2)

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

  const createRow = (row: SettingsRow): void => {
    const y = rowStartY + rowIndex * rowGap
    rowIndex += 1

    const highlightColor = theme.paletteNum.shadow ?? 0x000000
    const hit = scene.add
      .rectangle(0, y, rowWidth, rowHeight, highlightColor, 0)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerover', () => hit.setFillStyle(highlightColor, 0.18))
    hit.on('pointerout', () => hit.setFillStyle(highlightColor, 0))
    hit.on('pointerup', () => hit.setFillStyle(highlightColor, 0))
    hit.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation()
        hit.setFillStyle(highlightColor, 0.28)
        row.onToggle()
      },
    )

    const labelText = scene.add.text(-rowWidth / 2 + 6, y, row.label, labelStyle).setOrigin(0, 0.5)
    const valueText = scene.add.text(0, y, row.getValue(), valueStyle).setOrigin(0.5, 0.5)
    const badgeWidth = computeBadgeWidth(valueText)
    const badge = scene.add.rectangle(
      badgeRightX - badgeWidth / 2,
      y,
      badgeWidth,
      badgeHeight,
      theme.paletteNum.panel,
      0.2,
    )
    valueText.setPosition(badgeRightX - badgeWidth / 2, y)
    applyBadgeStyle(badge, valueText, row.getValue())

    valueTexts.push(valueText)
    valueBadges.push(badge)
    settingsPanel.add([hit, labelText, badge, valueText])
  }

  const items: Phaser.GameObjects.GameObject[] = [panel, title, hint]
  settingsPanel = scene.add.container(position.x, position.y, items)
  settingsPanel.setDepth(6)
  settingsPanel.setVisible(false)

  rows.forEach((row) => createRow(row))

  const closeButton = createSmallButton(scene, ui, theme, 'CLOSE', onClose)
  closeButton.setPosition(0, panelHeight / 2 - Math.round(16 * panelScale))
  settingsPanel.add(closeButton)

  const updateValues = (): void => {
    for (let i = 0; i < rows.length; i += 1) {
      const value = rows[i].getValue()
      const valueText = valueTexts[i]
      const badge = valueBadges[i]
      valueText.setText(value)
      const badgeWidth = computeBadgeWidth(valueText)
      const badgeX = badgeRightX - badgeWidth / 2
      badge.setSize(badgeWidth, badgeHeight)
      badge.setPosition(badgeX, valueText.y)
      valueText.setPosition(badgeX, valueText.y)
      applyBadgeStyle(badge, valueText, value)
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
