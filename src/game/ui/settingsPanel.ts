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
  const panelHeight = ui.panelSize.large.height + panelHeightOffset
  const rowWidth = panelWidth - 60
  const rowHeight = 22
  const rowStartY = -40
  const rowGap = 26

  const panel = createPanel(scene, ui, theme, 'large', panelWidth, panelHeight)

  const title = scene.add
    .text(0, -78, 'SETTINGS', ui.overlayTitleStyle)
    .setOrigin(0.5, 0.5)

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

  const createRow = (row: SettingsRow): void => {
    const y = rowStartY + rowIndex * rowGap
    rowIndex += 1

    const hit = scene.add
      .rectangle(0, y, rowWidth, rowHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
    hit.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation()
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

  const items: Phaser.GameObjects.GameObject[] = [panel, title]
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
