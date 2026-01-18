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
  const { scene, ui, theme, position, rows, onClose, panelHeightOffset = 30 } = options
  const panelWidth = ui.panelSize.large.width
  const rowWidth = panelWidth - 60
  const rowHeight = 22
  const rowGap = 26
  const headerHeight = 86
  const footerHeight = 62
  const basePanelHeight = ui.panelSize.large.height + panelHeightOffset
  const rowsHeight = rowHeight + (rows.length - 1) * rowGap
  const panelHeight = Math.max(basePanelHeight, rowsHeight + headerHeight + footerHeight)

  const panel = createPanel(scene, ui, theme, 'large', panelWidth, panelHeight)

  const titleY = -panelHeight / 2 + 34
  const title = scene.add.text(0, titleY, 'SETTINGS', ui.overlayTitleStyle).setOrigin(0.5, 0.5)

  const hintStyle = {
    ...ui.statLabelStyle,
    fontSize: scaleFontSize(ui.statLabelStyle.fontSize, 0.85),
  }
  const hint = scene.add
    .text(0, titleY + 26, 'Tap a row to toggle. Saved automatically.', hintStyle)
    .setOrigin(0.5, 0.5)
  hint.setWordWrapWidth(panelWidth - 80)

  const labelStyle = {
    ...ui.statLabelStyle,
    fontSize: '14px',
  }
  const valueStyle = {
    ...ui.statValueStyle,
    fontSize: '16px',
  }

  let rowIndex = 0
  const valueTexts: Phaser.GameObjects.Text[] = []
  let settingsPanel: Phaser.GameObjects.Container

  const rowsTop = titleY + 50
  const closeButtonY = panelHeight / 2 - 18
  const rowsBottom = closeButtonY - 28
  const rowsAreaHeight = rowsBottom - rowsTop
  const rowStartY =
    rowsTop + rowHeight / 2 + Math.max(0, (rowsAreaHeight - rowsHeight) / 2)

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
    const valueText = scene.add
      .text(rowWidth / 2 - 6, y, row.getValue(), valueStyle)
      .setOrigin(1, 0.5)

    valueTexts.push(valueText)
    settingsPanel.add([hit, labelText, valueText])
  }

  const items: Phaser.GameObjects.GameObject[] = [panel, title, hint]
  settingsPanel = scene.add.container(position.x, position.y, items)
  settingsPanel.setDepth(6)
  settingsPanel.setVisible(false)

  rows.forEach((row) => createRow(row))

  const closeButton = createSmallButton(scene, ui, theme, 'CLOSE', onClose)
  closeButton.setPosition(0, panelHeight / 2 - 18)
  settingsPanel.add(closeButton)

  const updateValues = (): void => {
    for (let i = 0; i < rows.length; i += 1) {
      valueTexts[i].setText(rows[i].getValue())
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
