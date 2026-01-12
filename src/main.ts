import './style.css'
import Phaser from 'phaser'
import { GAME_DIMENSIONS } from './game/config'
import { THEME } from './game/theme'
import { BootScene } from './game/scenes/BootScene'
import { PlayScene } from './game/scenes/PlayScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: THEME.ui.canvasBackground,
  width: GAME_DIMENSIONS.width,
  height: GAME_DIMENSIONS.height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_DIMENSIONS.width,
    height: GAME_DIMENSIONS.height,
  },
  scene: [BootScene, PlayScene],
}

new Phaser.Game(config)
