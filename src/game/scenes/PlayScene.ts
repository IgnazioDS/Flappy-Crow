import Phaser from 'phaser'
import { BIRD_CONFIG, GAME_DIMENSIONS, GROUND_HEIGHT, PIPE_CONFIG } from '../config'
import { Bird } from '../entities/Bird'
import { Ground } from '../entities/Ground'
import { PipePair } from '../entities/PipePair'
import { GameStateMachine } from '../state/GameStateMachine'
import { CollisionSystem } from '../systems/CollisionSystem'
import { DespawnSystem } from '../systems/DespawnSystem'
import { InputSystem } from '../systems/InputSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import { ASSETS, THEME } from '../theme'
import { defaultRng } from '../utils/rng'

type PipeSprites = {
  top: Phaser.GameObjects.Image
  bottom: Phaser.GameObjects.Image
}

type ParallaxLayer = {
  sprites: Phaser.GameObjects.Image[]
  speed: number
  width: number
}

type BirdVisualState = 'idle' | 'flap' | 'dead'

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
  private birdSprite!: Phaser.GameObjects.Sprite
  private birdVisualState: BirdVisualState = 'idle'
  private ground!: Ground
  private groundSprite!: Phaser.GameObjects.Image

  private parallaxLayers: ParallaxLayer[] = []
  private vignette!: Phaser.GameObjects.Image

  private pipes: PipePair[] = []
  private pipeSprites: PipeSprites[] = []
  private pipePool: PipePair[] = []
  private pipeSpritePool: PipeSprites[] = []

  private scoreText!: Phaser.GameObjects.Text
  private readyText!: Phaser.GameObjects.Text
  private gameOverText!: Phaser.GameObjects.Text
  private finalScoreText!: Phaser.GameObjects.Text
  private readyPanel!: Phaser.GameObjects.Rectangle
  private readyGrain!: Phaser.GameObjects.TileSprite
  private gameOverPanel!: Phaser.GameObjects.Rectangle
  private gameOverGrain!: Phaser.GameObjects.TileSprite

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
    this.createParallaxLayers()

    this.ground = new Ground()
    this.groundSprite = this.add
      .image(0, this.ground.y, ASSETS.ground)
      .setOrigin(0, 0)
      .setDepth(3)
    this.groundSprite.setDisplaySize(GAME_DIMENSIONS.width, GROUND_HEIGHT)

    this.createCrowAnimation()
    this.bird = new Bird(BIRD_CONFIG.startY)
    this.birdSprite = this.add.sprite(this.bird.x, this.bird.y, ASSETS.crowIdle).setDepth(2)
    const birdScale = (BIRD_CONFIG.radius * 2) / this.birdSprite.height
    this.birdSprite.setScale(birdScale)
    this.setBirdVisual('idle')

    this.scoreText = this.add
      .text(GAME_DIMENSIONS.width / 2, 40, '0', THEME.ui.scoreTextStyle)
      .setOrigin(0.5, 0.5)
      .setDepth(4)

    this.createOverlayPanels()

    this.readyText = this.add
      .text(
        GAME_DIMENSIONS.width / 2,
        GAME_DIMENSIONS.height * 0.35,
        'GET READY\nTap or Space to Flap',
        THEME.ui.overlayTextStyle,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(4)

    this.gameOverText = this.add
      .text(
        GAME_DIMENSIONS.width / 2,
        GAME_DIMENSIONS.height * 0.32,
        'GAME OVER',
        THEME.ui.overlayTextStyle,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(4)
      .setVisible(false)

    this.finalScoreText = this.add
      .text(
        GAME_DIMENSIONS.width / 2,
        GAME_DIMENSIONS.height * 0.4,
        'Score: 0\nTap or Space to Restart',
        THEME.ui.overlayTextStyle,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(4)
      .setVisible(false)

    this.createEmbers()
    this.createVignette()

    this.stateMachine.transition('BOOT_COMPLETE')
    this.enterReady()
    this.setupInput()
  }

  update(_time: number, deltaMs: number): void {
    const wantsFlap = this.inputSystem.consumeFlap()
    const dtMs = Math.min(deltaMs, 50)
    const dt = dtMs / 1000

    this.updateParallax(dt)

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

  private createParallaxLayers(): void {
    this.parallaxLayers.length = 0
    this.createParallaxLayer(ASSETS.bgFar, THEME.parallax.far, 0)
    this.createParallaxLayer(ASSETS.bgMid, THEME.parallax.mid, 0.4)
    this.createParallaxLayer(ASSETS.bgNear, THEME.parallax.near, 0.8)
  }

  private createParallaxLayer(key: string, speedFactor: number, depth: number): void {
    const width = GAME_DIMENSIONS.width
    const height = GAME_DIMENSIONS.height
    const first = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth)
    const second = this.add.image(width, 0, key).setOrigin(0, 0).setDepth(depth)
    first.setDisplaySize(width, height)
    second.setDisplaySize(width, height)
    this.parallaxLayers.push({
      sprites: [first, second],
      speed: PIPE_CONFIG.speed * speedFactor,
      width,
    })
  }

  private updateParallax(dt: number): void {
    if (!this.parallaxLayers.length) {
      return
    }

    for (const layer of this.parallaxLayers) {
      const shift = layer.speed * dt
      for (const sprite of layer.sprites) {
        sprite.x -= shift
        if (sprite.x <= -layer.width) {
          sprite.x += layer.width * 2
        }
      }
    }
  }

  private createCrowAnimation(): void {
    if (this.anims.exists('crow-flap')) {
      return
    }
    this.anims.create({
      key: 'crow-flap',
      frames: [
        { key: ASSETS.crowFlap0 },
        { key: ASSETS.crowFlap1 },
        { key: ASSETS.crowFlap2 },
        { key: ASSETS.crowFlap1 },
      ],
      frameRate: 12,
      repeat: -1,
    })
  }

  private setBirdVisual(state: BirdVisualState): void {
    if (this.birdVisualState === state) {
      return
    }
    this.birdVisualState = state

    if (state === 'flap') {
      this.birdSprite.play('crow-flap')
      return
    }

    this.birdSprite.stop()
    this.birdSprite.setTexture(state === 'dead' ? ASSETS.crowDead : ASSETS.crowIdle)
  }

  private createOverlayPanels(): void {
    const grainKey = 'ui-grain'
    this.createGrainTexture(grainKey, 64)

    const { panel, panelLarge } = THEME.ui
    const panelDepth = 3.6
    const grainDepth = 3.7

    const readyY = GAME_DIMENSIONS.height * 0.35
    this.readyPanel = this.add
      .rectangle(
        GAME_DIMENSIONS.width / 2,
        readyY,
        panel.width,
        panel.height,
        panel.fill,
        panel.fillAlpha,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(panelDepth)
    this.readyPanel.setStrokeStyle(panel.strokeThickness, panel.stroke, 0.9)
    this.readyGrain = this.add
      .tileSprite(GAME_DIMENSIONS.width / 2, readyY, panel.width, panel.height, grainKey)
      .setOrigin(0.5, 0.5)
      .setDepth(grainDepth)
      .setAlpha(panel.grainAlpha)

    const gameOverY = GAME_DIMENSIONS.height * 0.36
    this.gameOverPanel = this.add
      .rectangle(
        GAME_DIMENSIONS.width / 2,
        gameOverY,
        panelLarge.width,
        panelLarge.height,
        panel.fill,
        panel.fillAlpha,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(panelDepth)
      .setVisible(false)
    this.gameOverPanel.setStrokeStyle(panel.strokeThickness, panel.stroke, 0.9)
    this.gameOverGrain = this.add
      .tileSprite(
        GAME_DIMENSIONS.width / 2,
        gameOverY,
        panelLarge.width,
        panelLarge.height,
        grainKey,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(grainDepth)
      .setAlpha(panel.grainAlpha)
      .setVisible(false)
  }

  private createGrainTexture(key: string, size: number): void {
    if (this.textures.exists(key)) {
      return
    }
    const dots = size * 2
    const graphics = this.add.graphics({ x: 0, y: 0 })
    graphics.setVisible(false)
    for (let i = 0; i < dots; i += 1) {
      const x = Phaser.Math.Between(0, size - 1)
      const y = Phaser.Math.Between(0, size - 1)
      const alpha = Phaser.Math.FloatBetween(0.05, 0.25)
      graphics.fillStyle(0xffffff, alpha)
      graphics.fillRect(x, y, 1, 1)
    }
    graphics.generateTexture(key, size, size)
    graphics.destroy()
  }

  private setReadyOverlayVisible(visible: boolean): void {
    this.readyPanel.setVisible(visible)
    this.readyGrain.setVisible(visible)
    this.readyText.setVisible(visible)
  }

  private setGameOverOverlayVisible(visible: boolean): void {
    this.gameOverPanel.setVisible(visible)
    this.gameOverGrain.setVisible(visible)
    this.gameOverText.setVisible(visible)
    this.finalScoreText.setVisible(visible)
  }

  private createEmbers(): void {
    const embers = THEME.particles.embers
    if (!embers.enabled) {
      return
    }

    const zoneRect = new Phaser.Geom.Rectangle(
      0,
      0,
      GAME_DIMENSIONS.width,
      GAME_DIMENSIONS.height - GROUND_HEIGHT,
    )
    const scratchPoint = new Phaser.Geom.Point()
    const emitZone = new Phaser.GameObjects.Particles.Zones.RandomZone({
      getRandomPoint: (point) => {
        zoneRect.getRandomPoint(scratchPoint)
        point.x = scratchPoint.x
        point.y = scratchPoint.y
      },
    })
    const emitter = this.add.particles(0, 0, ASSETS.ember, {
      quantity: 1,
      frequency: embers.frequency,
      lifespan: { min: embers.lifespanMin, max: embers.lifespanMax },
      speedX: { min: -embers.speedMax, max: -embers.speedMin },
      speedY: { min: embers.driftMin, max: embers.driftMax },
      scale: { min: embers.scaleMin, max: embers.scaleMax },
      alpha: { min: embers.alphaMin, max: embers.alphaMax },
      emitZone,
      blendMode: Phaser.BlendModes.ADD,
    })
    emitter.setDepth(1.1)
  }

  private createVignette(): void {
    this.vignette = this.add
      .image(0, 0, ASSETS.vignette)
      .setOrigin(0, 0)
      .setDepth(3.8)
      .setAlpha(THEME.vignette.alpha)
    this.vignette.setDisplaySize(GAME_DIMENSIONS.width, GAME_DIMENSIONS.height)
  }

  private enterReady(): void {
    this.resetWorld()
    this.setBirdVisual('idle')
    this.setReadyOverlayVisible(true)
    this.setGameOverOverlayVisible(false)
  }

  private startPlaying(): void {
    this.stateMachine.transition('START')
    this.setBirdVisual('flap')
    this.setReadyOverlayVisible(false)
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
    this.setBirdVisual('dead')
    this.setReadyOverlayVisible(false)
    this.setGameOverOverlayVisible(true)
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
    const top = this.add.image(0, 0, ASSETS.obstacleTop).setOrigin(0, 1).setDepth(1)
    const bottom = this.add.image(0, 0, ASSETS.obstacleBottom).setOrigin(0, 0).setDepth(1)
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
