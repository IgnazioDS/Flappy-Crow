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
import { getActiveTheme, listThemes, setActiveThemeId } from '../theme'
import { createSeededRngFromEnv } from '../utils/rng'
import { setTelemetryOptOut, telemetry } from '../../telemetry'

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

type E2EDebugState = {
  state: string
  score: number
  bestScore: number
}

/**
 * Main gameplay scene. All rules live in deterministic systems/entities.
 */
export class PlayScene extends Phaser.Scene {
  private stateMachine = new GameStateMachine()
  private inputSystem = new InputSystem()
  private spawnSystem = new SpawnSystem(createSeededRngFromEnv())
  private scoreSystem = new ScoreSystem()
  private collisionSystem = new CollisionSystem()
  private despawnSystem = new DespawnSystem()
  private theme = getActiveTheme()
  private ui = this.theme.ui
  private fx = this.theme.fx
  private themeList = listThemes()

  private bird!: Bird
  private birdSprite!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image
  private birdGlow: Phaser.GameObjects.Image | null = null
  private birdVisualState: BirdVisualState = 'idle'
  private birdBobTime = 0

  private ground!: Ground
  private groundSprite!: Phaser.GameObjects.Image

  private parallaxLayers: ParallaxLayer[] = []
  private fogLayer: Phaser.GameObjects.TileSprite | null = null
  private vignette: Phaser.GameObjects.Image | null = null

  private pipes: PipePair[] = []
  private pipeSprites: PipeSprites[] = []
  private pipePool: PipePair[] = []
  private pipeSpritePool: PipeSprites[] = []
  private obstacleVariantIndex = 0
  private obstacleSwayClock = 0

  private scoreFrame!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle
  private scoreText!: Phaser.GameObjects.Text
  private readyContainer!: Phaser.GameObjects.Container
  private gameOverContainer!: Phaser.GameObjects.Container
  private finalScoreText!: Phaser.GameObjects.Text
  private bestScoreText!: Phaser.GameObjects.Text
  private medalSprite: Phaser.GameObjects.Image | null = null

  private muteIcon: Phaser.GameObjects.Image | null = null
  private motionIcon: Phaser.GameObjects.Image | null = null

  private debugGraphics!: Phaser.GameObjects.Graphics

  private settingsButton!: Phaser.GameObjects.Container
  private settingsPanel!: Phaser.GameObjects.Container
  private settingsOpen = false
  private settingsValues: {
    mute: Phaser.GameObjects.Text
    motion: Phaser.GameObjects.Text
    analytics: Phaser.GameObjects.Text
    theme?: Phaser.GameObjects.Text
    hitboxes?: Phaser.GameObjects.Text
  } | null = null

  private lastScore = -1
  private bestScore = 0
  private isMuted = false
  private reducedMotion = false
  private analyticsOptOut = false
  private debugEnabled = false
  private readonly debugToggleAllowed =
    import.meta.env.DEV || import.meta.env.VITE_ART_QA === 'true'
  private readonly e2eEnabled = String(import.meta.env.VITE_E2E).toLowerCase() === 'true'
  private e2eAutoplay = this.e2eEnabled
  private e2eLastFlapMs = 0
  private runStartMs: number | null = null
  private scorePulseTween?: Phaser.Tweens.Tween
  private readyTween?: Phaser.Tweens.Tween
  private gameOverTween?: Phaser.Tweens.Tween

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
    this.theme = getActiveTheme()
    this.ui = this.theme.ui
    this.fx = this.theme.fx
    this.themeList = listThemes()

    this.bestScore = this.readStoredNumber('flappy-best', 0)
    this.isMuted = this.readStoredBool('flappy-muted', false)
    this.reducedMotion = this.readStoredBool('flappy-reduced-motion', false)
    this.analyticsOptOut = this.readStoredBool('flappy-analytics-optout', false)
    this.debugEnabled = this.debugToggleAllowed
      ? this.readStoredBool('flappy-hitboxes', false)
      : false
    setTelemetryOptOut(this.analyticsOptOut)

    this.createParallaxLayers()
    this.createFogLayer()

    this.ground = new Ground()
    this.groundSprite = this.add
      .image(0, this.ground.y, this.theme.images.ground)
      .setOrigin(0, 0)
      .setDepth(3)
    this.groundSprite.setDisplaySize(GAME_DIMENSIONS.width, GROUND_HEIGHT)

    this.bird = new Bird(BIRD_CONFIG.startY)
    this.createBirdSprite()

    this.setBirdVisual('idle')

    this.scoreFrame = this.createScoreFrame()
    this.scoreText = this.add
      .text(this.ui.score.x, this.ui.score.y + 2, '0', this.ui.scoreTextStyle)
      .setOrigin(0.5, 0.5)
      .setDepth(4.1)

    this.createReadyOverlay()
    this.createGameOverOverlay()
    this.createToggles()
    this.createSettingsPanel()

    this.createParticles()
    this.createVignette()
    this.createDebugOverlay()

    this.stateMachine.transition('BOOT_COMPLETE')
    this.enterReady()
    this.setupInput()
  }

  update(_time: number, deltaMs: number): void {
    this.maybeAutoFlap()
    const wantsFlap = this.inputSystem.consumeFlap()
    const dtMs = Math.min(deltaMs, 50)
    const dt = dtMs / 1000

    this.updateParallax(dt)
    this.updateFog(dt)

    switch (this.stateMachine.state) {
      case 'READY':
        this.updateBirdVisual(dt)
        if (wantsFlap) {
          this.startPlaying()
        }
        break
      case 'PLAYING':
        if (wantsFlap) {
          telemetry.track('flap')
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

    this.updateDebugOverlay()
  }

  private setupInput(): void {
    this.input.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.settingsOpen || (currentlyOver && currentlyOver.length > 0)) {
        return
      }
      this.inputSystem.requestFlap()
      },
    )
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.settingsOpen) {
        this.inputSystem.requestFlap()
      }
    })
    this.input.keyboard?.on('keydown-H', () => this.toggleHitboxes())
    this.input.keyboard?.on('keydown-M', () => this.toggleMute())
    this.input.keyboard?.on('keydown-R', () => this.toggleReducedMotion())
    this.input.mouse?.disableContextMenu()
  }

  private createParallaxLayers(): void {
    this.parallaxLayers.length = 0
    if (this.theme.images.bgFar) {
      this.createParallaxLayer(this.theme.images.bgFar, this.fx.parallax.far, 0)
    }
    if (this.theme.images.bgMid) {
      this.createParallaxLayer(this.theme.images.bgMid, this.fx.parallax.mid, 0.35)
    }
    if (this.theme.images.bgNear) {
      this.createParallaxLayer(this.theme.images.bgNear, this.fx.parallax.near, 0.7)
    }
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

  private createFogLayer(): void {
    if (!this.theme.images.fog || this.fx.fog.alpha <= 0) {
      this.fogLayer = null
      return
    }
    this.fogLayer = this.add
      .tileSprite(0, 0, GAME_DIMENSIONS.width, GAME_DIMENSIONS.height, this.theme.images.fog)
      .setOrigin(0, 0)
      .setDepth(0.55)
      .setAlpha(this.fx.fog.alpha)
  }

  private updateFog(dt: number): void {
    if (!this.fogLayer) {
      return
    }
    this.fogLayer.tilePositionX += this.fx.fog.speedX * dt
    this.fogLayer.tilePositionY += this.fx.fog.speedX * 0.3 * dt
  }

  private createCrowAnimation(): void {
    if (this.anims.exists('flap-loop')) {
      return
    }
    const bird = this.theme.visuals.bird
    if (bird.type !== 'atlas' || !bird.flapFrames || !this.theme.assets.atlas) {
      return
    }
    this.anims.create({
      key: 'flap-loop',
      frames: bird.flapFrames.map((frame) => ({ key: bird.key, frame })),
      frameRate: 12,
      repeat: -1,
    })
  }

  private createBirdSprite(): void {
    const bird = this.theme.visuals.bird

    if (bird.type === 'atlas') {
      this.createCrowAnimation()
      this.birdSprite = this.add
        .sprite(this.bird.x, this.bird.y, bird.key, bird.idleFrame)
        .setDepth(2)
      this.birdSprite.setOrigin(0.45, 0.55)
    } else {
      this.birdSprite = this.add.image(this.bird.x, this.bird.y, bird.key).setDepth(2)
      this.birdSprite.setOrigin(0.5, 0.5)
    }

    const birdScale = (BIRD_CONFIG.radius * 2) / this.birdSprite.height
    this.birdSprite.setScale(birdScale)

    if (bird.glowFrame && this.theme.assets.atlas) {
      this.birdGlow = this.add
        .image(this.bird.x, this.bird.y, bird.key, bird.glowFrame)
        .setDepth(2.1)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.birdGlow.setScale(birdScale * 0.75)
    } else {
      this.birdGlow = null
    }
  }

  private createScoreFrame(): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const uiAssets = this.theme.visuals.ui
    if (uiAssets.kind === 'atlas' && uiAssets.atlasKey && uiAssets.frames?.scoreFrame) {
      return this.add
        .image(this.ui.score.x, this.ui.score.y, uiAssets.atlasKey, uiAssets.frames.scoreFrame)
        .setDepth(4)
    }

    return this.add
      .rectangle(
        this.ui.score.x,
        this.ui.score.y,
        this.ui.scoreFrameSize.width,
        this.ui.scoreFrameSize.height,
        this.ui.panel.fill,
        this.ui.panel.alpha,
      )
      .setStrokeStyle(this.ui.panel.strokeThickness, this.ui.panel.stroke)
      .setDepth(4)
  }

  private setBirdVisual(state: BirdVisualState): void {
    if (this.birdVisualState === state) {
      return
    }
    this.birdVisualState = state

    const bird = this.theme.visuals.bird
    if (bird.type === 'atlas' && this.birdSprite instanceof Phaser.GameObjects.Sprite) {
      if (state === 'flap' && bird.flapFrames) {
        this.birdSprite.play('flap-loop')
        if (this.birdGlow) {
          this.birdGlow.setAlpha(1)
        }
        return
      }

      this.birdSprite.stop()
      if (bird.deadFrame && bird.idleFrame) {
        this.birdSprite.setTexture(bird.key, state === 'dead' ? bird.deadFrame : bird.idleFrame)
      }
      if (this.birdGlow) {
        this.birdGlow.setAlpha(state === 'dead' ? 0.2 : 1)
      }
      return
    }

    if (this.birdGlow) {
      this.birdGlow.setAlpha(state === 'dead' ? 0.2 : 1)
    }
  }

  private createPanel(
    size: 'small' | 'large',
    widthOverride?: number,
    heightOverride?: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const uiAssets = this.theme.visuals.ui
    const panelSize = this.ui.panelSize[size]
    const panelWidth = widthOverride ?? panelSize.width
    const panelHeight = heightOverride ?? panelSize.height

    if (
      uiAssets.kind === 'atlas' &&
      uiAssets.atlasKey &&
      ((size === 'small' && uiAssets.frames?.panelSmall) ||
        (size === 'large' && uiAssets.frames?.panelLarge))
    ) {
      const frame = size === 'small' ? uiAssets.frames?.panelSmall : uiAssets.frames?.panelLarge
      return this.add
        .image(0, 0, uiAssets.atlasKey, frame)
        .setDisplaySize(panelWidth, panelHeight)
    }

    return this.add
      .rectangle(0, 0, panelWidth, panelHeight, this.ui.panel.fill, this.ui.panel.alpha)
      .setStrokeStyle(this.ui.panel.strokeThickness, this.ui.panel.stroke)
  }

  private createButtonBase(scale = 1): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const uiAssets = this.theme.visuals.ui
    if (uiAssets.kind === 'atlas' && uiAssets.atlasKey && uiAssets.frames?.button) {
      const image = this.add.image(0, 0, uiAssets.atlasKey, uiAssets.frames.button)
      image.setScale(scale)
      return image
    }

    const width = this.ui.button.width * scale
    const height = this.ui.button.height * scale
    return this.add
      .rectangle(0, 0, width, height, this.ui.panel.fill, this.ui.panel.alpha)
      .setStrokeStyle(this.ui.panel.strokeThickness, this.ui.panel.stroke)
  }

  private createReadyOverlay(): void {
    const panel = this.createPanel('small')
    const title = this.add.text(0, -20, 'GET READY', this.ui.overlayTitleStyle).setOrigin(0.5, 0.5)
    const subtitle = this.add
      .text(0, 22, 'Tap or Space to Flap', this.ui.overlayBodyStyle)
      .setOrigin(0.5, 0.5)

    this.readyContainer = this.add.container(this.ui.layout.ready.x, this.ui.layout.ready.y, [
      panel,
      title,
      subtitle,
    ])
    this.readyContainer.setDepth(5)
    this.readyContainer.setVisible(false)
  }

  private createGameOverOverlay(): void {
    const panel = this.createPanel('large')
    const title = this.add.text(0, -66, 'GAME OVER', this.ui.overlayTitleStyle).setOrigin(0.5, 0.5)

    const scoreLabel = this.add
      .text(-20, -26, 'SCORE', this.ui.statLabelStyle)
      .setOrigin(0, 0.5)
    this.finalScoreText = this.add
      .text(-20, -4, '0', this.ui.statValueStyle)
      .setOrigin(0, 0.5)

    const bestLabel = this.add
      .text(-20, 24, 'BEST', this.ui.statLabelStyle)
      .setOrigin(0, 0.5)
    this.bestScoreText = this.add
      .text(-20, 46, String(this.bestScore), this.ui.statValueStyle)
      .setOrigin(0, 0.5)

    const overlayItems: Phaser.GameObjects.GameObject[] = [
      panel,
      title,
      scoreLabel,
      this.finalScoreText,
      bestLabel,
      this.bestScoreText,
    ]

    const uiAssets = this.theme.visuals.ui
    if (uiAssets.kind === 'atlas' && uiAssets.frames?.medalBronze && uiAssets.atlasKey) {
      this.medalSprite = this.add
        .image(-110, 8, uiAssets.atlasKey, uiAssets.frames.medalBronze)
        .setScale(0.9)
      overlayItems.push(this.medalSprite)
    } else {
      this.medalSprite = null
    }

    const restartButton = this.createRestartButton()
    restartButton.setPosition(0, 84)
    overlayItems.push(restartButton)

    this.gameOverContainer = this.add.container(
      this.ui.layout.gameOver.x,
      this.ui.layout.gameOver.y,
      overlayItems,
    )
    this.gameOverContainer.setDepth(5)
    this.gameOverContainer.setVisible(false)
  }

  private createRestartButton(): Phaser.GameObjects.Container {
    const uiAssets = this.theme.visuals.ui
    const buttonBase = this.createButtonBase()
    buttonBase.setInteractive({ useHandCursor: true })
    buttonBase.on('pointerdown', () => this.restart())

    const label = this.add
      .text(0, 0, 'RESTART', this.ui.button.textStyle)
      .setOrigin(0.5, 0.5)

    const items: Phaser.GameObjects.GameObject[] = [buttonBase, label]
    if (uiAssets.kind === 'atlas' && uiAssets.frames?.iconRestart && uiAssets.atlasKey) {
      const icon = this.add.image(-54, 0, uiAssets.atlasKey, uiAssets.frames.iconRestart).setScale(0.9)
      items.splice(1, 0, icon)
      label.setX(18)
    }

    return this.add.container(0, 0, items)
  }

  private createToggles(): void {
    const iconScale = this.ui.icon.size / 24
    const topY = 28
    const rightX = GAME_DIMENSIONS.width - this.ui.icon.padding - this.ui.icon.size / 2
    const motionX = rightX - (this.ui.icon.size + 10)
    const hitArea = new Phaser.Geom.Rectangle(-22, -22, 44, 44)
    const hitConfig = {
      hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    }

    const uiAssets = this.theme.visuals.ui
    if (
      uiAssets.kind === 'atlas' &&
      uiAssets.frames?.iconMotionOn &&
      uiAssets.frames?.iconMotionOff &&
      uiAssets.frames?.iconMuteOn &&
      uiAssets.frames?.iconMuteOff &&
      uiAssets.atlasKey
    ) {
      this.motionIcon = this.add
        .image(
          motionX,
          topY,
          uiAssets.atlasKey,
          this.reducedMotion ? uiAssets.frames.iconMotionOff : uiAssets.frames.iconMotionOn,
        )
        .setDepth(4.2)
        .setScale(iconScale)
        .setInteractive(hitConfig)
      this.motionIcon.on('pointerdown', () => this.toggleReducedMotion())

      this.muteIcon = this.add
        .image(
          rightX,
          topY,
          uiAssets.atlasKey,
          this.isMuted ? uiAssets.frames.iconMuteOff : uiAssets.frames.iconMuteOn,
        )
        .setDepth(4.2)
        .setScale(iconScale)
        .setInteractive(hitConfig)
      this.muteIcon.on('pointerdown', () => this.toggleMute())
    } else {
      this.motionIcon = null
      this.muteIcon = null
    }

    this.createSettingsButton()
  }

  private createSettingsButton(): void {
    const buttonImage = this.createButtonBase(0.42)
    buttonImage.setInteractive({ useHandCursor: true })

    const labelStyle = {
      ...this.ui.statLabelStyle,
      fontSize: '12px',
      color: this.ui.statValueStyle.color,
    }
    const label = this.add.text(0, 1, 'SET', labelStyle).setOrigin(0.5, 0.5)

    this.settingsButton = this.add.container(this.ui.icon.padding + 34, 28, [buttonImage, label])
    this.settingsButton.setDepth(4.2)
    buttonImage.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
      event.stopPropagation()
      this.toggleSettingsPanel()
      },
    )
  }

  private createSettingsPanel(): void {
    const panelWidth = this.ui.panelSize.large.width
    const panelHeight = this.ui.panelSize.large.height
    const rowWidth = panelWidth - 60
    const rowHeight = 22
    const rowStartY = -40
    const rowGap = 26

    const panel = this.createPanel('large', panelWidth, panelHeight)

    const title = this.add
      .text(0, -78, 'SETTINGS', this.ui.overlayTitleStyle)
      .setOrigin(0.5, 0.5)

    const labelStyle = {
      ...this.ui.statLabelStyle,
      fontSize: '14px',
    }
    const valueStyle = {
      ...this.ui.statValueStyle,
      fontSize: '16px',
    }

    let rowIndex = 0

    const createRow = (
      label: string,
      getValue: () => string,
      onToggle: () => void,
    ): Phaser.GameObjects.Text => {
      const y = rowStartY + rowIndex * rowGap
      rowIndex += 1

      const hit = this.add
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
        onToggle()
        },
      )

      const labelText = this.add.text(-rowWidth / 2 + 6, y, label, labelStyle).setOrigin(0, 0.5)
      const valueText = this.add
        .text(rowWidth / 2 - 6, y, getValue(), valueStyle)
        .setOrigin(1, 0.5)

      this.settingsPanel.add([hit, labelText, valueText])
      return valueText
    }

    const items: Phaser.GameObjects.GameObject[] = [panel, title]
    this.settingsPanel = this.add.container(
      GAME_DIMENSIONS.width / 2,
      140,
      items,
    )
    this.settingsPanel.setDepth(6)
    this.settingsPanel.setVisible(false)

    const muteValue = createRow('MUTE', () => (this.isMuted ? 'ON' : 'OFF'), () =>
      this.toggleMute(),
    )
    const motionValue = createRow(
      'MOTION',
      () => (this.reducedMotion ? 'REDUCED' : 'FULL'),
      () => this.toggleReducedMotion(),
    )
    const analyticsValue = createRow(
      'ANALYTICS',
      () => (this.analyticsOptOut ? 'OFF' : 'ON'),
      () => this.toggleAnalyticsOptOut(),
    )
    const themeValue = createRow('THEME', () => this.theme.name, () => this.toggleTheme())

    let hitboxesValue: Phaser.GameObjects.Text | undefined
    if (this.debugToggleAllowed) {
      hitboxesValue = createRow(
        'HITBOXES',
        () => (this.debugEnabled ? 'ON' : 'OFF'),
        () => this.toggleHitboxes(),
      )
    }

    const closeButton = this.createSmallButton('CLOSE', () => this.toggleSettingsPanel())
    closeButton.setPosition(0, panelHeight / 2 - 18)
    this.settingsPanel.add(closeButton)

    this.settingsValues = {
      mute: muteValue,
      motion: motionValue,
      analytics: analyticsValue,
      theme: themeValue,
      hitboxes: hitboxesValue,
    }
    this.updateSettingsValues()
  }

  private createSmallButton(label: string, onClick: () => void): Phaser.GameObjects.Container {
    const buttonImage = this.createButtonBase(0.4)
    buttonImage.setInteractive({ useHandCursor: true })

    const text = this.add
      .text(0, 1, label, this.ui.button.textStyle)
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

    return this.add.container(0, 0, [buttonImage, text])
  }

  private toggleSettingsPanel(): void {
    this.settingsOpen = !this.settingsOpen
    this.settingsPanel.setVisible(this.settingsOpen)
    if (this.settingsOpen) {
      this.updateSettingsValues()
    }
  }

  private createParticles(): void {
    const particles = this.theme.visuals.particles
    if (!particles || !this.theme.assets.atlas) {
      return
    }
    if (particles.ember) {
      this.createEmitter(particles.ember, this.fx.embers, Phaser.BlendModes.ADD, this.theme.assets.atlas.key)
    }
    if (particles.dust) {
      this.createEmitter(particles.dust, this.fx.dust, Phaser.BlendModes.NORMAL, this.theme.assets.atlas.key)
    }
    if (particles.leaf) {
      this.createEmitter(particles.leaf, this.fx.leaf, Phaser.BlendModes.NORMAL, this.theme.assets.atlas.key)
    }
  }

  private createEmitter(
    frame: string,
    config: {
      enabled: boolean
      frequency: number
      count: number
      speedMin: number
      speedMax: number
      driftMin: number
      driftMax: number
      scaleMin: number
      scaleMax: number
      alphaMin: number
      alphaMax: number
      lifespanMin: number
      lifespanMax: number
    },
    blendMode: Phaser.BlendModes,
    atlasKey: string,
  ): void {
    if (!config.enabled) {
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

    const emitter = this.add.particles(0, 0, atlasKey, {
      frame,
      maxParticles: config.count,
      quantity: 1,
      frequency: config.frequency,
      lifespan: { min: config.lifespanMin, max: config.lifespanMax },
      speedX: { min: -config.speedMax, max: -config.speedMin },
      speedY: { min: config.driftMin, max: config.driftMax },
      scale: { min: config.scaleMin, max: config.scaleMax },
      alpha: { min: config.alphaMin, max: config.alphaMax },
      emitZone,
      blendMode,
    })
    emitter.setDepth(1.1)
  }

  private createVignette(): void {
    if (!this.theme.images.vignette || this.fx.vignette.alpha <= 0) {
      this.vignette = null
      return
    }
    this.vignette = this.add
      .image(0, 0, this.theme.images.vignette)
      .setOrigin(0, 0)
      .setDepth(3.9)
      .setAlpha(this.fx.vignette.alpha)
    this.vignette.setDisplaySize(GAME_DIMENSIONS.width, GAME_DIMENSIONS.height)
  }

  private createDebugOverlay(): void {
    this.debugGraphics = this.add.graphics().setDepth(10)
    this.debugGraphics.setVisible(this.debugEnabled)
  }

  private toggleHitboxes(): void {
    if (!this.debugToggleAllowed) {
      return
    }
    this.debugEnabled = !this.debugEnabled
    this.debugGraphics.setVisible(this.debugEnabled)
    if (!this.debugEnabled) {
      this.debugGraphics.clear()
    }
    this.storeBool('flappy-hitboxes', this.debugEnabled)
    this.updateSettingsValues()
  }

  private enterReady(): void {
    this.resetWorld()
    this.setBirdVisual('idle')
    this.showReadyOverlay(true)
    this.showGameOverOverlay(false)
    this.runStartMs = null
    this.e2eAutoplay = this.e2eEnabled
    telemetry.track('game_ready_shown')
    this.setE2EState({
      state: 'READY',
      score: this.scoreSystem.score,
      bestScore: this.bestScore,
    })
  }

  private startPlaying(): void {
    this.stateMachine.transition('START')
    this.setBirdVisual('flap')
    this.showReadyOverlay(false)
    if (this.settingsOpen) {
      this.toggleSettingsPanel()
    }
    this.runStartMs = this.time.now
    telemetry.track('game_start')
    telemetry.track('flap')
    this.setE2EState({ state: 'PLAYING' })
    this.bird.flap()
  }

  private restart(): void {
    this.stateMachine.transition('RESTART')
    telemetry.track('restart')
    this.enterReady()
  }

  private updatePlaying(dt: number, dtMs: number): void {
    const hitGround = this.bird.update(dt, this.ground.y)
    this.updateBirdVisual(dt)

    this.spawnSystem.update(dtMs, this.handleSpawn)

    this.obstacleSwayClock += dtMs

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
      this.pulseScore()
      telemetry.track('score_increment', { score: this.scoreSystem.score })
      this.setE2EState({ score: this.scoreSystem.score })
      if (this.e2eAutoplay && this.scoreSystem.score >= 1) {
        this.e2eAutoplay = false
      }
    }
  }

  private updateGameOver(dt: number): void {
    const wasAboveGround = this.bird.y + BIRD_CONFIG.radius < this.ground.y
    if (wasAboveGround) {
      this.bird.update(dt, this.ground.y)
      this.updateBirdVisual(dt)
    }
  }

  private triggerGameOver(): void {
    if (this.stateMachine.state !== 'PLAYING') {
      return
    }
    this.stateMachine.transition('HIT')
    this.setBirdVisual('dead')
    this.showReadyOverlay(false)
    this.showGameOverOverlay(true)

    if (!this.reducedMotion) {
      this.cameras.main.shake(this.fx.screenShake.duration, this.fx.screenShake.intensity)
    }

    const score = this.scoreSystem.score
    if (score > this.bestScore) {
      this.bestScore = score
      this.storeNumber('flappy-best', score)
    }

    this.finalScoreText.setText(String(score))
    this.bestScoreText.setText(String(this.bestScore))
    this.updateMedal(score)

    const sessionDurationMs =
      this.runStartMs === null ? 0 : Math.max(0, this.time.now - this.runStartMs)
    telemetry.track('game_over', {
      score,
      bestScore: this.bestScore,
      sessionDurationMs: Math.round(sessionDurationMs),
    })
    this.runStartMs = null
    this.setE2EState({
      state: 'GAME_OVER',
      score,
      bestScore: this.bestScore,
    })
  }

  private updateMedal(score: number): void {
    if (!this.medalSprite) {
      return
    }
    const uiAssets = this.theme.visuals.ui
    if (uiAssets.kind !== 'atlas' || !uiAssets.frames || !uiAssets.atlasKey) {
      return
    }

    let frame = uiAssets.frames.medalBronze
    if (score >= 25) {
      frame = uiAssets.frames.medalVoid
    } else if (score >= 18) {
      frame = uiAssets.frames.medalGold
    } else if (score >= 10) {
      frame = uiAssets.frames.medalSilver
    }

    if (frame) {
      this.medalSprite.setTexture(uiAssets.atlasKey, frame)
    }
  }

  private resetWorld(): void {
    this.bird.reset(BIRD_CONFIG.startY)
    this.birdBobTime = 0
    this.obstacleSwayClock = 0
    this.updateBirdVisual(0)

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
    this.applyObstacleVariant(sprites)
    this.pipeSprites.push(sprites)
    this.updatePipeSprites(pipe, sprites)
    sprites.top.setVisible(true)
    sprites.bottom.setVisible(true)
  }

  private nextObstacleVariant(): number {
    const obstacles = this.theme.visuals.obstacles
    const frames = obstacles.topFrames
    if (!frames || frames.length === 0) {
      return 0
    }
    const next = this.obstacleVariantIndex
    this.obstacleVariantIndex = (this.obstacleVariantIndex + 1) % frames.length
    return next
  }

  private createPipeSprites(): PipeSprites {
    const obstacles = this.theme.visuals.obstacles
    const top = this.add.image(0, 0, obstacles.key, obstacles.topKey ?? obstacles.topFrames?.[0])
    const bottom = this.add.image(0, 0, obstacles.key, obstacles.bottomKey ?? obstacles.bottomFrames?.[0])
    top.setOrigin(0, 1).setDepth(1)
    bottom.setOrigin(0, 0).setDepth(1)
    if (obstacles.type === 'image' && obstacles.flipTop) {
      top.setFlipY(true)
    }
    return { top, bottom }
  }

  private applyObstacleVariant(sprites: PipeSprites): void {
    const obstacles = this.theme.visuals.obstacles
    if (obstacles.type !== 'atlas' || !obstacles.topFrames || !obstacles.bottomFrames) {
      return
    }
    const variantIndex = this.nextObstacleVariant()
    sprites.top.setTexture(obstacles.key, obstacles.topFrames[variantIndex])
    sprites.bottom.setTexture(obstacles.key, obstacles.bottomFrames[variantIndex])
  }

  private updatePipeSprites(pipe: PipePair, sprites: PipeSprites): void {
    const topHeight = Math.max(0, pipe.topHeight)
    const bottomHeight = Math.max(0, pipe.bottomHeight)

    const swayPhase = this.reducedMotion ? 0 : this.obstacleSwayClock * this.fx.obstacleSway.speed
    const sway =
      this.reducedMotion ? 0 : Math.sin((pipe.x + swayPhase) * 0.01) * this.fx.obstacleSway.amplitude

    sprites.top.setPosition(pipe.x, topHeight)
    sprites.top.setDisplaySize(PIPE_CONFIG.width, topHeight)
    sprites.top.setRotation(-sway)
    sprites.top.setVisible(topHeight > 0)

    sprites.bottom.setPosition(pipe.x, pipe.bottomY)
    sprites.bottom.setDisplaySize(PIPE_CONFIG.width, bottomHeight)
    sprites.bottom.setRotation(sway)
    sprites.bottom.setVisible(bottomHeight > 0)
  }

  private updateBirdVisual(dt: number): void {
    if (this.stateMachine.state === 'READY' && !this.reducedMotion) {
      this.birdBobTime += dt * this.fx.readyBob.speed
    }

    const bobOffset =
      this.stateMachine.state === 'READY' && !this.reducedMotion
        ? Math.sin(this.birdBobTime) * this.fx.readyBob.amplitude
        : 0

    this.birdSprite.setPosition(this.bird.x, this.bird.y + bobOffset)
    if (this.birdGlow) {
      this.birdGlow.setPosition(this.bird.x + 8, this.bird.y - 2 + bobOffset)
    }

    const range = BIRD_CONFIG.maxFallSpeed - BIRD_CONFIG.maxRiseSpeed
    const t = Phaser.Math.Clamp((this.bird.velocity - BIRD_CONFIG.maxRiseSpeed) / range, 0, 1)
    const rotation = Phaser.Math.Linear(BIRD_CONFIG.rotationUp, BIRD_CONFIG.rotationDown, t)
    this.birdSprite.setRotation(rotation)
    if (this.birdGlow) {
      this.birdGlow.setRotation(rotation)
    }
  }

  private showReadyOverlay(visible: boolean): void {
    if (visible) {
      this.readyContainer.setVisible(true)
      this.animateOverlay(this.readyContainer, 'ready')
    } else {
      this.readyTween?.stop()
      this.readyContainer.setVisible(false)
    }
  }

  private showGameOverOverlay(visible: boolean): void {
    if (visible) {
      this.gameOverContainer.setVisible(true)
      this.animateOverlay(this.gameOverContainer, 'gameover')
    } else {
      this.gameOverTween?.stop()
      this.gameOverContainer.setVisible(false)
    }
  }

  private animateOverlay(container: Phaser.GameObjects.Container, kind: 'ready' | 'gameover'): void {
    if (this.reducedMotion) {
      container.setAlpha(1)
      container.setScale(1)
      return
    }

    const tweenRef = kind === 'ready' ? this.readyTween : this.gameOverTween
    tweenRef?.stop()

    container.setAlpha(0)
    container.setScale(0.98)

    const tween = this.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Sine.Out',
    })

    if (kind === 'ready') {
      this.readyTween = tween
    } else {
      this.gameOverTween = tween
    }
  }

  private pulseScore(): void {
    if (this.reducedMotion) {
      return
    }

    this.scorePulseTween?.stop()
    this.scoreFrame.setScale(1)
    this.scoreText.setScale(1)
    this.scorePulseTween = this.tweens.add({
      targets: [this.scoreFrame, this.scoreText],
      scale: this.fx.scorePulse.scale,
      duration: this.fx.scorePulse.duration,
      yoyo: true,
      ease: 'Sine.Out',
    })
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted
    const uiAssets = this.theme.visuals.ui
    if (
      this.muteIcon &&
      uiAssets.kind === 'atlas' &&
      uiAssets.atlasKey &&
      uiAssets.frames?.iconMuteOff &&
      uiAssets.frames?.iconMuteOn
    ) {
      this.muteIcon.setTexture(
        uiAssets.atlasKey,
        this.isMuted ? uiAssets.frames.iconMuteOff : uiAssets.frames.iconMuteOn,
      )
    }
    this.storeBool('flappy-muted', this.isMuted)
    telemetry.track('mute_toggle', { muted: this.isMuted })
    this.updateSettingsValues()
  }

  private toggleReducedMotion(): void {
    this.reducedMotion = !this.reducedMotion
    const uiAssets = this.theme.visuals.ui
    if (
      this.motionIcon &&
      uiAssets.kind === 'atlas' &&
      uiAssets.atlasKey &&
      uiAssets.frames?.iconMotionOff &&
      uiAssets.frames?.iconMotionOn
    ) {
      this.motionIcon.setTexture(
        uiAssets.atlasKey,
        this.reducedMotion ? uiAssets.frames.iconMotionOff : uiAssets.frames.iconMotionOn,
      )
    }
    this.storeBool('flappy-reduced-motion', this.reducedMotion)

    if (this.reducedMotion) {
      this.readyTween?.stop()
      this.gameOverTween?.stop()
      this.scorePulseTween?.stop()
      this.scoreFrame.setScale(1)
      this.scoreText.setScale(1)
    }
    this.updateSettingsValues()
  }

  private toggleAnalyticsOptOut(): void {
    this.analyticsOptOut = !this.analyticsOptOut
    setTelemetryOptOut(this.analyticsOptOut)
    this.updateSettingsValues()
  }

  private toggleTheme(): void {
    if (this.themeList.length < 2) {
      return
    }
    const currentIndex = this.themeList.findIndex((theme) => theme.id === this.theme.id)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % this.themeList.length
    const nextTheme = this.themeList[nextIndex]
    setActiveThemeId(nextTheme.id)
    window.location.reload()
  }

  private updateSettingsValues(): void {
    if (!this.settingsValues) {
      return
    }
    this.settingsValues.mute.setText(this.isMuted ? 'ON' : 'OFF')
    this.settingsValues.motion.setText(this.reducedMotion ? 'REDUCED' : 'FULL')
    this.settingsValues.analytics.setText(this.analyticsOptOut ? 'OFF' : 'ON')
    if (this.settingsValues.theme) {
      this.settingsValues.theme.setText(this.theme.name)
    }
    if (this.settingsValues.hitboxes) {
      this.settingsValues.hitboxes.setText(this.debugEnabled ? 'ON' : 'OFF')
    }
  }

  private maybeAutoFlap(): void {
    if (!this.e2eAutoplay || this.stateMachine.state !== 'PLAYING') {
      return
    }
    const gapY = this.getUpcomingGapY()
    if (gapY === null) {
      return
    }
    const now = this.time.now
    const shouldFlap = this.bird.y > gapY + 6
    if (shouldFlap && now - this.e2eLastFlapMs > 180) {
      this.e2eLastFlapMs = now
      this.inputSystem.requestFlap()
    }
  }

  private getUpcomingGapY(): number | null {
    if (this.pipes.length === 0) {
      return BIRD_CONFIG.startY
    }
    for (const pipe of this.pipes) {
      if (pipe.x + PIPE_CONFIG.width >= this.bird.x) {
        return pipe.gapY
      }
    }
    return null
  }

  private setE2EState(partial: Partial<E2EDebugState>): void {
    if (!this.e2eEnabled || typeof window === 'undefined') {
      return
    }
    const win = window as Window & { __flappyDebug?: E2EDebugState }
    if (!win.__flappyDebug) {
      win.__flappyDebug = {
        state: this.stateMachine.state,
        score: this.scoreSystem.score,
        bestScore: this.bestScore,
      }
    }
    Object.assign(win.__flappyDebug, partial)
  }

  private updateDebugOverlay(): void {
    if (!this.debugEnabled) {
      return
    }

    this.debugGraphics.clear()
    this.debugGraphics.lineStyle(1, 0x5ad5e8, 0.9)
    this.debugGraphics.strokeCircle(this.bird.x, this.bird.y, BIRD_CONFIG.radius)

    this.debugGraphics.lineStyle(1, 0xff4fa3, 0.8)
    const groundY = this.ground.y
    this.debugGraphics.lineBetween(0, groundY, GAME_DIMENSIONS.width, groundY)

    this.debugGraphics.lineStyle(1, 0x48c8d8, 0.5)
    this.debugGraphics.lineBetween(0, PIPE_CONFIG.topMargin, GAME_DIMENSIONS.width, PIPE_CONFIG.topMargin)
    this.debugGraphics.lineBetween(
      0,
      groundY - PIPE_CONFIG.bottomMargin,
      GAME_DIMENSIONS.width,
      groundY - PIPE_CONFIG.bottomMargin,
    )

    this.debugGraphics.lineStyle(1, 0xffb06a, 0.7)
    for (const pipe of this.pipes) {
      this.debugGraphics.strokeRect(pipe.x, 0, PIPE_CONFIG.width, pipe.topHeight)
      this.debugGraphics.strokeRect(pipe.x, pipe.bottomY, PIPE_CONFIG.width, pipe.bottomHeight)
      this.debugGraphics.lineBetween(pipe.x, pipe.gapY, pipe.x + PIPE_CONFIG.width, pipe.gapY)
    }
  }

  private readStoredNumber(key: string, fallback: number): number {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private readStoredBool(key: string, fallback: boolean): boolean {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return fallback
    }
    return raw === 'true'
  }

  private storeNumber(key: string, value: number): void {
    window.localStorage.setItem(key, String(value))
  }

  private storeBool(key: string, value: boolean): void {
    window.localStorage.setItem(key, String(value))
  }
}
