import Phaser from 'phaser'
import type { ThemeDefinition, ThemeUI } from '../theme/types'

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

export const applyButtonFeedback = (
  button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle,
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
  buttonImage.setInteractive({ useHandCursor: true })
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
