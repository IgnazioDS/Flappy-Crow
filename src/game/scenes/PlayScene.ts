import Phaser from 'phaser'
import {
  ASSETS,
  BIRD_CONFIG,
  GAME_DIMENSIONS,
  GROUND_HEIGHT,
  OVERLAY_TEXT_STYLE,
  PIPE_CONFIG,
  SCORE_TEXT_STYLE,
} from '../config'
import { Bird } from '../entities/Bird'
import { Ground } from '../entities/Ground'
import { PipePair } from '../entities/PipePair'
import { GameStateMachine } from '../state/GameStateMachine'
import { CollisionSystem } from '../systems/CollisionSystem'
import { DespawnSystem } from '../systems/DespawnSystem'
import { InputSystem } from '../systems/InputSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import { defaultRng } from '../utils/rng'

type PipeSprites = {
  top: Phaser.GameObjects.Image
  bottom: Phaser.GameObjects.Image
}

/**
 * Main gameplay scene. All rules live in deterministic systems/entities.
 */
export class PlayScene extends Phaser.Scene {
  private stateMachine = new GameStateMachine()
  private inputSystem = new InputSystem()
  private spawnSystem = new SpawnSystem(defaultRng)
  private scoreSystem = new ScoreSystem()
  private collisionSystem = new CollisionSystem()
  private despawnSystem = new DespawnSystem()

  private bird!: Bird
  private birdSprite!: Phaser.GameObjects.Image
  private ground!: Ground
  private groundSprite!: Phaser.GameObjects.Image

  private pipes: PipePair[] = []
  private pipeSprites: PipeSprites[] = []
  private pipePool: PipePair[] = []
  private pipeSpritePool: PipeSprites[] = []

  private scoreText!: Phaser.GameObjects.Text
  private readyText!: Phaser.GameObjects.Text
  private gameOverText!: Phaser.GameObjects.Text
  private finalScoreText!: Phaser.GameObjects.Text

  private lastScore = -1
  private readonly handleSpawn = (gapCenterY: number) => {
    this.spawnPipePair(gapCenterY)
  }
  private readonly handleDespawn = (_pipe: PipePair, index: number) => {
    const sprites = this.pipeSprites.splice(index, 1)[0]
    sprites.top.setVisible(false)
    sprites.bottom.setVisible(false)
    this.pipeSpritePool.push(sprites)
  }

  constructor() {
    super('PlayScene')
  }

  create(): void {
    const background = this.add.image(0, 0, ASSETS.background).setOrigin(0, 0).setDepth(0)
    background.setDisplaySize(GAME_DIMENSIONS.width, GAME_DIMENSIONS.height)

    this.ground = new Ground()
    this.groundSprite = this.add
      .image(0, this.ground.y, ASSETS.ground)
      .setOrigin(0, 0)
      .setDepth(3)
    this.groundSprite.setDisplaySize(GAME_DIMENSIONS.width, GROUND_HEIGHT)

    this.bird = new Bird(BIRD_CONFIG.startY)
    this.birdSprite = this.add.image(this.bird.x, this.bird.y, ASSETS.bird).setDepth(2)
    const birdScale = (BIRD_CONFIG.radius * 2) / this.birdSprite.height
    this.birdSprite.setScale(birdScale)

    this.scoreText = this.add
      .text(GAME_DIMENSIONS.width / 2, 40, '0', SCORE_TEXT_STYLE)
      .setOrigin(0.5, 0.5)
      .setDepth(4)

    this.readyText = this.add
      .text(
        GAME_DIMENSIONS.width / 2,
        GAME_DIMENSIONS.height * 0.35,
        'GET READY\nTap or Space to Flap',
        OVERLAY_TEXT_STYLE,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(4)

    this.gameOverText = this.add
      .text(
        GAME_DIMENSIONS.width / 2,
        GAME_DIMENSIONS.height * 0.32,
        'GAME OVER',
        OVERLAY_TEXT_STYLE,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(4)
      .setVisible(false)

    this.finalScoreText = this.add
      .text(
        GAME_DIMENSIONS.width / 2,
        GAME_DIMENSIONS.height * 0.4,
        'Score: 0\nTap or Space to Restart',
        OVERLAY_TEXT_STYLE,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(4)
      .setVisible(false)

    this.stateMachine.transition('BOOT_COMPLETE')
    this.enterReady()
    this.setupInput()
  }

  update(_time: number, deltaMs: number): void {
    const wantsFlap = this.inputSystem.consumeFlap()
    const dtMs = Math.min(deltaMs, 50)
    const dt = dtMs / 1000

    switch (this.stateMachine.state) {
      case 'READY':
        if (wantsFlap) {
          this.startPlaying()
        }
        break
      case 'PLAYING':
        if (wantsFlap) {
          this.bird.flap()
        }
        this.updatePlaying(dt, dtMs)
        break
      case 'GAME_OVER':
        if (wantsFlap) {
          this.restart()
        } else {
          this.updateGameOver(dt)
        }
        break
      default:
        break
    }
  }

  private setupInput(): void {
    this.input.on('pointerdown', () => this.inputSystem.requestFlap())
    this.input.keyboard?.on('keydown-SPACE', () => this.inputSystem.requestFlap())
    this.input.mouse?.disableContextMenu()
  }

  private enterReady(): void {
    this.resetWorld()
    this.readyText.setVisible(true)
    this.gameOverText.setVisible(false)
    this.finalScoreText.setVisible(false)
  }

  private startPlaying(): void {
    this.stateMachine.transition('START')
    this.readyText.setVisible(false)
    this.bird.flap()
  }

  private restart(): void {
    this.stateMachine.transition('RESTART')
    this.enterReady()
  }

  private updatePlaying(dt: number, dtMs: number): void {
    const hitGround = this.bird.update(dt, this.ground.y)
    this.updateBirdVisual()

    this.spawnSystem.update(dtMs, this.handleSpawn)

    for (let i = 0; i < this.pipes.length; i += 1) {
      this.pipes[i].update(dt)
      this.updatePipeSprites(this.pipes[i], this.pipeSprites[i])
    }

    this.despawnSystem.update(this.pipes, this.pipePool, this.handleDespawn)

    if (hitGround || this.collisionSystem.check(this.bird, this.pipes, this.ground.y)) {
      this.triggerGameOver()
    }

    this.scoreSystem.update(this.bird.x, this.pipes)
    if (this.scoreSystem.score !== this.lastScore) {
      this.lastScore = this.scoreSystem.score
      this.scoreText.setText(String(this.scoreSystem.score))
    }
  }

  private updateGameOver(dt: number): void {
    const wasAboveGround = this.bird.y + BIRD_CONFIG.radius < this.ground.y
    if (wasAboveGround) {
      this.bird.update(dt, this.ground.y)
      this.updateBirdVisual()
    }
  }

  private triggerGameOver(): void {
    if (this.stateMachine.state !== 'PLAYING') {
      return
    }
    this.stateMachine.transition('HIT')
    this.gameOverText.setVisible(true)
    this.finalScoreText.setVisible(true)
    this.finalScoreText.setText(`Score: ${this.scoreSystem.score}\nTap or Space to Restart`)
  }

  private resetWorld(): void {
    this.bird.reset(BIRD_CONFIG.startY)
    this.updateBirdVisual()

    for (let i = this.pipes.length - 1; i >= 0; i -= 1) {
      this.pipePool.push(this.pipes[i])
      const sprites = this.pipeSprites[i]
      sprites.top.setVisible(false)
      sprites.bottom.setVisible(false)
      this.pipeSpritePool.push(sprites)
    }
    this.pipes.length = 0
    this.pipeSprites.length = 0

    this.spawnSystem.reset()
    this.scoreSystem.reset()
    this.lastScore = -1
    this.scoreText.setText('0')
  }

  private spawnPipePair(gapCenterY: number): void {
    const spawnX = GAME_DIMENSIONS.width + PIPE_CONFIG.width
    const pipe = this.pipePool.pop() ?? new PipePair(spawnX, gapCenterY)
    pipe.reset(spawnX, gapCenterY)
    this.pipes.push(pipe)

    const sprites = this.pipeSpritePool.pop() ?? this.createPipeSprites()
    this.pipeSprites.push(sprites)
    this.updatePipeSprites(pipe, sprites)
    sprites.top.setVisible(true)
    sprites.bottom.setVisible(true)
  }

  private createPipeSprites(): PipeSprites {
    const top = this.add.image(0, 0, ASSETS.pipe).setOrigin(0, 1).setDepth(1)
    top.setFlipY(true)
    const bottom = this.add.image(0, 0, ASSETS.pipe).setOrigin(0, 0).setDepth(1)
    return { top, bottom }
  }

  private updatePipeSprites(pipe: PipePair, sprites: PipeSprites): void {
    const topHeight = Math.max(0, pipe.topHeight)
    const bottomHeight = Math.max(0, pipe.bottomHeight)

    sprites.top.setPosition(pipe.x, topHeight)
    sprites.top.setDisplaySize(PIPE_CONFIG.width, topHeight)
    sprites.top.setVisible(topHeight > 0)

    sprites.bottom.setPosition(pipe.x, pipe.bottomY)
    sprites.bottom.setDisplaySize(PIPE_CONFIG.width, bottomHeight)
    sprites.bottom.setVisible(bottomHeight > 0)
  }

  private updateBirdVisual(): void {
    this.birdSprite.setPosition(this.bird.x, this.bird.y)
    const range = BIRD_CONFIG.maxFallSpeed - BIRD_CONFIG.maxRiseSpeed
    const t = Phaser.Math.Clamp((this.bird.velocity - BIRD_CONFIG.maxRiseSpeed) / range, 0, 1)
    const rotation = Phaser.Math.Linear(BIRD_CONFIG.rotationUp, BIRD_CONFIG.rotationDown, t)
    this.birdSprite.setRotation(rotation)
  }
}
