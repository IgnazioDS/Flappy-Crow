import Phaser from 'phaser'
import {
  BIRD_CONFIG,
  GAME_DIMENSIONS,
  GROUND_HEIGHT,
  PERFORMANCE_CONFIG,
  PIPE_CONFIG,
} from '../config'
import { ECONOMY_CONFIG } from '../economy/economyConfig'
import { Bird } from '../entities/Bird'
import { Ground } from '../entities/Ground'
import { PipePair } from '../entities/PipePair'
import { GameStateMachine } from '../state/GameStateMachine'
import { CollisionSystem } from '../systems/CollisionSystem'
import { CurrencySystem } from '../systems/CurrencySystem'
import { DespawnSystem } from '../systems/DespawnSystem'
import { InputSystem } from '../systems/InputSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import { BackgroundSystem } from '../systems/BackgroundSystem'
import { getActiveTheme, listThemes, setActiveThemeId } from '../theme'
import { DEFAULT_ENV, ENVIRONMENTS } from '../theme/env'
import type { EnvironmentConfig, EnvironmentKey, ParticleConfig } from '../theme/env/types'
import {
  readStoredBool,
  readStoredNumber,
  readStoredString,
  storeBool,
  storeNumber,
  storeString,
} from '../persistence/storage'
import { SaveSystem } from '../persistence/SaveSystem'
import {
  applyButtonFeedback,
  applyMinHitArea,
  createButtonBase,
  createPanel,
  createSmallButton,
} from '../ui/uiFactory'
import { createSettingsPanel, type SettingsPanelHandle } from '../ui/settingsPanel'
import {
  buildShareUrl,
  copyShareUrl,
  createShareCardCanvas,
  downloadShareCard,
} from '../ui/shareCard'
import { ImpactBurst } from '../effects/ImpactBurst'
import { ScreenFlash } from '../effects/ScreenFlash'
import {
  applyAccessibilityTheme,
  getNextContrastMode,
  getNextHandedness,
  getNextTextScale,
  readAccessibilitySettings,
  storeContrastMode,
  storeHandedness,
  storeTextScale,
  type ContrastMode,
  type Handedness,
} from '../ui/accessibility'
import {
  SeededRng,
  createSeededRngFromEnvOverride,
  defaultRng,
  getDailySeed,
  seedFromString,
} from '../utils/rng'
import {
  DEFAULT_GAME_MODE,
  getGameModeConfig,
  getNextGameModeId,
  normalizeGameModeId,
  type GameModeConfig,
  type GameModeId,
} from '../modes/modeConfig'
import { PRACTICE_CONFIG } from '../modes/practiceConfig'
import { computeDifficultyTuning } from '../modes/tuning'
import { ObstacleVariantSystem, type ObstacleVariant } from '../obstacles/ObstacleVariantSystem'
import { ReplayRecorder } from '../replay/ReplayRecorder'
import { ReplayPlayer } from '../replay/ReplayPlayer'
import { loadBestReplay, saveBestReplay } from '../replay/ReplayStorage'
import type { ReplayData } from '../replay/types'
import { AnalyticsSystem } from '../systems/AnalyticsSystem'
import {
  getTelemetryConsent,
  setTelemetryConsent,
  telemetry,
  telemetryHasProviders,
} from '../../telemetry'

type PipeSprites = {
  top: Phaser.GameObjects.Image
  bottom: Phaser.GameObjects.Image
  topGlow?: Phaser.GameObjects.Image
  bottomGlow?: Phaser.GameObjects.Image
}

type ParallaxLayer = {
  sprites: Phaser.GameObjects.Image[]
  speedFactor: number
  width: number
}

type BirdVisualState = 'idle' | 'flap' | 'dead'

type E2EDebugState = {
  state: string
  score: number
  bestScore: number
  seedMode: 'normal' | 'daily' | 'custom'
  seedLabel: string
  gameMode: GameModeId
  practiceEnabled: boolean
  reducedMotion: boolean
}

/**
 * Main gameplay scene. All rules live in deterministic systems/entities.
 */
export class PlayScene extends Phaser.Scene {
  private stateMachine = new GameStateMachine()
  private inputSystem = new InputSystem()
  private spawnSystem!: SpawnSystem
  private scoreSystem = new ScoreSystem()
  private currencySystem = new CurrencySystem(ECONOMY_CONFIG.rewardPolicy)
  private collisionSystem = new CollisionSystem()
  private despawnSystem = new DespawnSystem()
  private theme = getActiveTheme()
  private ui = this.theme.ui
  private fx = this.theme.fx
  private themeList = listThemes()
  private backgroundSystem: BackgroundSystem | null = null
  private environmentKey: EnvironmentKey | null = null
  private environmentConfig: EnvironmentConfig | null = null

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
  private screenFlash: ScreenFlash | null = null
  private impactBurst: ImpactBurst | null = null

  private pipes: PipePair[] = []
  private pipeSprites: PipeSprites[] = []
  private pipeVariants: ObstacleVariant[] = []
  private pipePool: PipePair[] = []
  private pipeSpritePool: PipeSprites[] = []
  private obstacleVariantSystem: ObstacleVariantSystem | null = null
  private obstacleVariantIndex = 0
  private obstacleSwayClock = 0

  private scoreFrame!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle
  private scoreText!: Phaser.GameObjects.Text
  private readyContainer!: Phaser.GameObjects.Container
  private gameOverContainer!: Phaser.GameObjects.Container
  private finalScoreText!: Phaser.GameObjects.Text
  private bestScoreText!: Phaser.GameObjects.Text
  private bestLabelText!: Phaser.GameObjects.Text
  private coinsEarnedText!: Phaser.GameObjects.Text
  private totalCoinsText!: Phaser.GameObjects.Text
  private medalSprite: Phaser.GameObjects.Image | null = null

  private muteIcon: Phaser.GameObjects.Image | null = null
  private motionIcon: Phaser.GameObjects.Image | null = null

  private debugGraphics!: Phaser.GameObjects.Graphics
  private envDebugText: Phaser.GameObjects.Text | null = null
  private envDebugEnabled = false

  private particleManagers: Phaser.GameObjects.Particles.ParticleEmitter[] = []

  private settingsButton!: Phaser.GameObjects.Container
  private settingsPanel!: SettingsPanelHandle
  private settingsBackdrop: Phaser.GameObjects.Rectangle | null = null
  private settingsOpen = false
  private telemetryConsentPanel: Phaser.GameObjects.Container | null = null
  private telemetryConsentOpen = false
  private debugMenu: Phaser.GameObjects.Container | null = null
  private debugMenuBackdrop: Phaser.GameObjects.Rectangle | null = null
  private debugMenuOpen = false
  private readonly debugMenuEnabled = import.meta.env.DEV
  private safeArea = { top: 0, right: 0, bottom: 0, left: 0 }

  private lastScore = -1
  private bestScore = 0
  private coinsEarned = 0
  private totalCoins = 0
  private isMuted = false
  private reducedMotion = false
  private analyticsConsent: 'granted' | 'denied' | null = null
  private readonly privacyPolicyUrl = String(import.meta.env.VITE_PRIVACY_POLICY_URL ?? '').trim()
  private gameModeId: GameModeId = DEFAULT_GAME_MODE
  private gameMode: GameModeConfig = getGameModeConfig(DEFAULT_GAME_MODE)
  private practiceEnabled = false
  private practiceInvulnMs = 0
  private practiceCheckpointY = BIRD_CONFIG.startY
  private handMode: Handedness = 'normal'
  private contrastMode: ContrastMode = 'normal'
  private textScale = 1
  private ghostEnabled = true
  private bestReplay: ReplayData | null = null
  private replayRecorder: ReplayRecorder | null = null
  private ghostPlayer: ReplayPlayer | null = null
  private speedScale = 1
  private currentGap = PIPE_CONFIG.gap
  private seedMode: 'normal' | 'daily' | 'custom' = 'normal'
  private seedValue: number | null = null
  private seedLabel = 'NORMAL'
  private debugEnabled = false
  private saveSystem: SaveSystem | null = null
  private analyticsSystem = new AnalyticsSystem({ logToConsole: import.meta.env.DEV })
  private readonly debugToggleAllowed =
    import.meta.env.DEV || import.meta.env.VITE_ART_QA === 'true'
  private readonly e2eEnabled =
    import.meta.env.DEV && String(import.meta.env.VITE_E2E).toLowerCase() === 'true'
  private e2eAutoplay = this.e2eEnabled
  private e2eLastFlapMs = 0
  private runStartMs: number | null = null
  private scorePulseTween?: Phaser.Tweens.Tween
  private readyTween?: Phaser.Tweens.Tween
  private gameOverTween?: Phaser.Tweens.Tween
  private cameraPunchTween?: Phaser.Tweens.Tween
  private visibilityPaused = false
  private perfLowPower = false
  private perfLowFpsMs = 0
  private perfHighFpsMs = 0
  private readonly handleVisibilityChange = () => {
    if (typeof document === 'undefined') {
      return
    }
    const hidden = document.visibilityState === 'hidden'
    if (hidden && !this.visibilityPaused) {
      this.visibilityPaused = true
      this.scene.pause()
    } else if (!hidden && this.visibilityPaused) {
      this.visibilityPaused = false
      this.scene.resume()
    }
  }
  private readonly handleResize = () => {
    this.updateSafeAreaLayout()
  }

  private readonly handleSpawn = (gapCenterY: number) => {
    this.spawnPipePair(gapCenterY)
  }
  private readonly handleDespawn = (_pipe: PipePair, index: number) => {
    const sprites = this.pipeSprites.splice(index, 1)[0]
    sprites.top.setVisible(false)
    sprites.bottom.setVisible(false)
    sprites.topGlow?.setVisible(false)
    sprites.bottomGlow?.setVisible(false)
    this.pipeSpritePool.push(sprites)
    this.pipeVariants.splice(index, 1)
  }

  constructor() {
    super('PlayScene')
  }

  create(): void {
    const accessibility = readAccessibilitySettings()
    this.handMode = accessibility.hand
    this.contrastMode = accessibility.contrast
    this.textScale = accessibility.textScale
    this.theme = applyAccessibilityTheme(getActiveTheme(), accessibility)
    this.ui = this.theme.ui
    this.fx = this.theme.fx
    this.applyDocumentTheme()
    this.themeList = listThemes()

    const storedMode = readStoredString('flappy-mode')
    this.gameModeId = normalizeGameModeId(storedMode)
    this.gameMode = getGameModeConfig(this.gameModeId)
    this.bestScore = this.readBestScore()
    this.isMuted = readStoredBool('flappy-muted', false)
    this.reducedMotion = readStoredBool('flappy-reduced-motion', false)
    this.analyticsConsent = getTelemetryConsent()
    this.practiceEnabled = readStoredBool('flappy-practice', false)
    this.ghostEnabled = readStoredBool('flappy-ghost', true)
    this.bestReplay = loadBestReplay(this.gameModeId)
    this.saveSystem = new SaveSystem()
    this.totalCoins = this.saveSystem.getState().coins
    this.debugEnabled = this.debugToggleAllowed
      ? readStoredBool('flappy-hitboxes', false)
      : false
    this.envDebugEnabled = this.debugToggleAllowed
      ? readStoredBool('flappy-env-debug', false)
      : false
    if (this.analyticsConsent) {
      setTelemetryConsent(this.analyticsConsent)
    }

    const seedConfig = this.resolveSeedConfig()
    this.seedMode = seedConfig.mode
    this.seedLabel = seedConfig.label
    this.seedValue = seedConfig.seed
    this.spawnSystem = new SpawnSystem(createSeededRngFromEnvOverride(seedConfig.seed))
    const variantSeed =
      this.seedValue === null ? null : (this.seedValue ^ 0x9e3779b9) >>> 0
    const variantRng = variantSeed === null ? defaultRng : new SeededRng(variantSeed)
    this.obstacleVariantSystem = new ObstacleVariantSystem(variantRng)

    const envDebugParam = this.readQueryParam('envDebug')
    if (this.debugToggleAllowed && envDebugParam !== null) {
      const enabled = envDebugParam !== '0'
      this.envDebugEnabled = enabled
      storeBool('flappy-env-debug', enabled)
    }

    this.environmentKey = this.resolveEnvironmentKey()
    this.environmentConfig =
      this.environmentKey && this.theme.id === 'evil-forest'
        ? ENVIRONMENTS[this.environmentKey]
        : null

    this.createBackground()

    this.ground = new Ground()
    this.groundSprite = this.add
      .image(0, this.ground.y, this.theme.images.ground)
      .setOrigin(0, 0)
      .setDepth(3)
    this.groundSprite.setDisplaySize(GAME_DIMENSIONS.width, GROUND_HEIGHT)

    this.bird = new Bird(BIRD_CONFIG.startY)
    this.createBirdSprite()
    this.ghostPlayer = new ReplayPlayer(this, this.theme)

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
    this.createDebugMenu()
    this.createTelemetryConsentOverlay()
    this.updateSafeAreaLayout()

    this.createParticles()
    this.createVignette()
    this.createImpactFx()
    this.createDebugOverlay()
    this.createEnvDebugOverlay()
    this.startSceneFade()

    this.stateMachine.transition('BOOT_COMPLETE')
    this.enterReady()
    this.setupInput()
    this.setupVisibilityHandlers()
    this.scale.on('resize', this.handleResize)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize)
    })
  }

  update(_time: number, deltaMs: number): void {
    this.maybeAutoFlap()
    const wantsFlap = this.inputSystem.consumeFlap()
    const dtMs = Math.min(deltaMs, 50)
    const dt = dtMs / 1000
    this.updatePerformanceMode(dtMs)

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
          this.replayRecorder?.recordFlap(this.time.now)
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

    if (this.stateMachine.state !== 'PLAYING') {
      this.speedScale = 1
      this.currentGap = PIPE_CONFIG.gap
      this.backgroundSystem?.setSpeedScale(1)
    }

    this.updateParallax(dt)
    this.updateFog(dt)
    this.backgroundSystem?.update(dt)

    this.updateDebugOverlay()
    this.updateEnvDebugOverlay()
  }

  private setupInput(): void {
    this.input.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (
          this.settingsOpen ||
          this.telemetryConsentOpen ||
          (currentlyOver && currentlyOver.length > 0)
        ) {
          return
        }
        this.inputSystem.requestFlap()
      },
    )
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.settingsOpen && !this.telemetryConsentOpen) {
        this.inputSystem.requestFlap()
      }
    })
    this.input.keyboard?.on('keydown-H', () => this.toggleHitboxes())
    this.input.keyboard?.on('keydown-D', () => this.toggleEnvDebugOverlay())
    this.input.keyboard?.on('keydown-M', () => this.toggleMute())
    this.input.keyboard?.on('keydown-R', () => this.toggleReducedMotion())
    this.input.keyboard?.on('keydown-E', () => this.toggleEnvironment())
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.debugMenuOpen) {
        this.toggleDebugMenu()
        return
      }
      if (this.settingsOpen) {
        this.toggleSettingsPanel()
      }
    })
    this.input.mouse?.disableContextMenu()
  }

  private setupVisibilityHandlers(): void {
    if (typeof document === 'undefined') {
      return
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    })
  }

  private applyDocumentTheme(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = this.theme.palette.background
      document.body.style.backgroundColor = this.theme.palette.background
    }
    this.cameras.main.setBackgroundColor(this.theme.palette.background)
    this.cameras.main.setZoom(1)
  }

  private updatePerformanceMode(dtMs: number): void {
    if (this.reducedMotion) {
      this.perfLowFpsMs = 0
      this.perfHighFpsMs = 0
      return
    }
    const fps = this.game.loop?.actualFps ?? 0
    if (!fps) {
      return
    }
    if (fps < PERFORMANCE_CONFIG.lowFpsThreshold) {
      this.perfLowFpsMs += dtMs
      this.perfHighFpsMs = 0
    } else if (fps > PERFORMANCE_CONFIG.highFpsThreshold) {
      this.perfHighFpsMs += dtMs
      this.perfLowFpsMs = 0
    } else {
      this.perfLowFpsMs = 0
      this.perfHighFpsMs = 0
    }

    if (!this.perfLowPower && this.perfLowFpsMs >= PERFORMANCE_CONFIG.lowFpsWindowMs) {
      this.setLowPowerMode(true)
    }
    if (this.perfLowPower && this.perfHighFpsMs >= PERFORMANCE_CONFIG.recoveryWindowMs) {
      this.setLowPowerMode(false)
    }
  }

  private setLowPowerMode(enabled: boolean): void {
    this.perfLowPower = enabled
    this.perfLowFpsMs = 0
    this.perfHighFpsMs = 0
    this.backgroundSystem?.setReducedMotion(this.isMotionReduced())
    this.backgroundSystem?.setLowPowerMode(enabled)
    if (enabled) {
      this.clearParticles()
      this.screenFlash?.setEnabled(false)
      this.impactBurst?.setEnabled(false)
      this.scorePulseTween?.stop()
      this.scoreFrame.setScale(1)
      this.scoreText.setScale(1)
    } else {
      this.createParticles()
      this.screenFlash?.setEnabled(true)
      this.impactBurst?.setEnabled(true)
    }
  }

  private isMotionReduced(): boolean {
    return this.reducedMotion || this.perfLowPower
  }

  private startSceneFade(): void {
    if (this.isMotionReduced() || !this.fx.sceneFade.enabled) {
      return
    }
    const color = Phaser.Display.Color.HexStringToColor(this.theme.palette.background)
    this.cameras.main.fadeIn(this.fx.sceneFade.durationMs, color.red, color.green, color.blue)
  }

  private getDifficultyTuning(): { speedScale: number; gap: number } {
    if (this.e2eEnabled) {
      return { speedScale: 1, gap: PIPE_CONFIG.gap }
    }
    return computeDifficultyTuning(
      this.scoreSystem.score,
      this.gameMode.tuning,
      this.practiceEnabled ? PRACTICE_CONFIG : null,
    )
  }

  private resolveSeedConfig(): {
    seed: number | null
    mode: 'normal' | 'daily' | 'custom'
    label: string
  } {
    const seedParam = this.readQueryParam('seed')
    if (seedParam) {
      const seed = seedFromString(seedParam)
      return { seed, mode: 'custom', label: seedParam }
    }

    const dailyParam = this.readQueryParam('daily')
    if (dailyParam !== null && dailyParam !== '0') {
      const daily = getDailySeed()
      return { seed: daily.seed, mode: 'daily', label: daily.label }
    }

    return { seed: null, mode: 'normal', label: 'NORMAL' }
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
      speedFactor,
      width,
    })
  }

  private createBackground(): void {
    if (this.theme.id !== 'evil-forest') {
      this.createParallaxLayers()
      this.createFogLayer()
      return
    }

    const envKey = this.environmentKey ?? DEFAULT_ENV
    this.environmentKey = envKey
    this.environmentConfig = ENVIRONMENTS[envKey]
    this.backgroundSystem = new BackgroundSystem(this, this.environmentConfig)
    this.backgroundSystem.setReducedMotion(this.isMotionReduced())
    this.backgroundSystem.create()
  }

  private updateParallax(dt: number): void {
    if (this.isMotionReduced() || !this.parallaxLayers.length) {
      return
    }

    for (const layer of this.parallaxLayers) {
      const shift = PIPE_CONFIG.speed * this.speedScale * layer.speedFactor * dt
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
    if (this.isMotionReduced() || !this.fogLayer) {
      return
    }
    this.fogLayer.tilePositionX += this.fx.fog.speedX * dt
    this.fogLayer.tilePositionY += this.fx.fog.speedX * 0.3 * dt
  }

  private resolveEnvironmentKey(): EnvironmentKey | null {
    if (this.theme.id !== 'evil-forest') {
      return null
    }
    const envParam = this.readQueryParam('env')
    if (envParam && this.isEnvironmentKey(envParam)) {
      this.storeEnvironmentKey(envParam)
      return envParam
    }
    const stored = this.readStoredEnvironmentKey()
    if (stored) {
      return stored
    }
    return DEFAULT_ENV
  }

  private isEnvironmentKey(value: string): value is EnvironmentKey {
    return value in ENVIRONMENTS
  }

  private readStoredEnvironmentKey(): EnvironmentKey | null {
    const raw = readStoredString('flappy-env')
    if (!raw) {
      return null
    }
    return this.isEnvironmentKey(raw) ? raw : null
  }

  private storeEnvironmentKey(key: EnvironmentKey): void {
    storeString('flappy-env', key)
  }

  private toggleEnvironment(): void {
    if (this.theme.id !== 'evil-forest') {
      return
    }
    if (!this.debugToggleAllowed) {
      return
    }
    const keys = Object.keys(ENVIRONMENTS) as EnvironmentKey[]
    const current = this.environmentKey ?? DEFAULT_ENV
    const currentIndex = keys.indexOf(current)
    const next = keys[(currentIndex + 1) % keys.length] ?? DEFAULT_ENV
    this.applyEnvironment(next)
  }

  private applyEnvironment(envKey: EnvironmentKey): void {
    this.environmentKey = envKey
    this.environmentConfig = ENVIRONMENTS[envKey]
    this.storeEnvironmentKey(envKey)
    if (this.backgroundSystem) {
      this.backgroundSystem.setEnvironment(this.environmentConfig)
      this.backgroundSystem.setReducedMotion(this.isMotionReduced())
      this.backgroundSystem.setSpeedScale(this.speedScale)
    } else {
      this.backgroundSystem = new BackgroundSystem(this, this.environmentConfig)
      this.backgroundSystem.setReducedMotion(this.isMotionReduced())
      this.backgroundSystem.setSpeedScale(this.speedScale)
      this.backgroundSystem.create()
    }
    this.createParticles()
    this.updateEnvDebugOverlay()
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

  private createReadyOverlay(): void {
    const panel = createPanel(this, this.ui, this.theme, 'small')
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
    const panelWidth = this.ui.panelSize.large.width
    const panelHeight = 240
    const panel = createPanel(this, this.ui, this.theme, 'large', panelWidth, panelHeight)
    const title = this.add
      .text(0, -panelHeight / 2 + 30, 'RUN SUMMARY', this.ui.overlayTitleStyle)
      .setOrigin(0.5, 0.5)

    const scoreLabel = this.add
      .text(-20, -58, 'SCORE', this.ui.statLabelStyle)
      .setOrigin(0, 0.5)
    this.finalScoreText = this.add
      .text(-20, -36, '0', this.ui.statValueStyle)
      .setOrigin(0, 0.5)

    this.bestLabelText = this.add
      .text(-20, -8, 'BEST', this.ui.statLabelStyle)
      .setOrigin(0, 0.5)
    this.bestScoreText = this.add
      .text(-20, 12, String(this.bestScore), this.ui.statValueStyle)
      .setOrigin(0, 0.5)

    const coinsLabel = this.add
      .text(-20, 40, 'COINS', this.ui.statLabelStyle)
      .setOrigin(0, 0.5)
    this.coinsEarnedText = this.add
      .text(-20, 60, '0', this.ui.statValueStyle)
      .setOrigin(0, 0.5)

    const totalLabel = this.add
      .text(-20, 88, 'TOTAL', this.ui.statLabelStyle)
      .setOrigin(0, 0.5)
    this.totalCoinsText = this.add
      .text(-20, 108, String(this.totalCoins), this.ui.statValueStyle)
      .setOrigin(0, 0.5)

    const overlayItems: Phaser.GameObjects.GameObject[] = [
      panel,
      title,
      scoreLabel,
      this.finalScoreText,
      this.bestLabelText,
      this.bestScoreText,
      coinsLabel,
      this.coinsEarnedText,
      totalLabel,
      this.totalCoinsText,
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

    const playAgainButton = this.createPlayAgainButton()
    playAgainButton.setPosition(0, panelHeight / 2 + 30)
    overlayItems.push(playAgainButton)

    const homeButton = createSmallButton(this, this.ui, this.theme, 'HOME', () => this.restart())
    homeButton.setPosition(-70, panelHeight / 2 + 66)
    overlayItems.push(homeButton)

    const shareButton = createSmallButton(this, this.ui, this.theme, 'SHARE', () =>
      this.shareRunCard(),
    )
    shareButton.setPosition(70, panelHeight / 2 + 66)
    overlayItems.push(shareButton)

    this.gameOverContainer = this.add.container(
      this.ui.layout.gameOver.x,
      this.ui.layout.gameOver.y,
      overlayItems,
    )
    this.gameOverContainer.setDepth(5)
    this.gameOverContainer.setVisible(false)
  }

  private createPlayAgainButton(): Phaser.GameObjects.Container {
    const uiAssets = this.theme.visuals.ui
    const buttonBase = createButtonBase(this, this.ui, this.theme)
    applyMinHitArea(buttonBase)
    applyButtonFeedback(buttonBase)
    buttonBase.on('pointerdown', () => this.restart())

    const label = this.add
      .text(0, 0, 'PLAY AGAIN', this.ui.button.textStyle)
      .setOrigin(0.5, 0.5)
      .setScale(0.92)

    const items: Phaser.GameObjects.GameObject[] = [buttonBase, label]
    if (uiAssets.kind === 'atlas' && uiAssets.frames?.iconRestart && uiAssets.atlasKey) {
      const icon = this.add.image(-54, 0, uiAssets.atlasKey, uiAssets.frames.iconRestart).setScale(0.9)
      this.applyIconContrast(icon)
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
      this.applyIconContrast(this.motionIcon)

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
      this.applyIconContrast(this.muteIcon)
    } else {
      this.motionIcon = null
      this.muteIcon = null
    }

    this.createSettingsButton()
    this.applyHandednessLayout()
  }

  private createSettingsButton(): void {
    const buttonImage = createButtonBase(this, this.ui, this.theme, 0.42)
    const labelStyle = {
      ...this.ui.statLabelStyle,
      fontSize: '12px',
      color: this.ui.statValueStyle.color,
    }
    const label = this.add.text(0, 1, 'SET', labelStyle).setOrigin(0.5, 0.5)

    this.settingsButton = this.add.container(this.ui.icon.padding + 34, 28, [buttonImage, label])
    this.settingsButton.setDepth(4.2)
    const hitWidth = Math.max(buttonImage.displayWidth, 44)
    const hitHeight = Math.max(buttonImage.displayHeight, 44)
    const hitArea = new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight)
    this.settingsButton.setSize(hitWidth, hitHeight)
    this.settingsButton.setInteractive({
      hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    })
    applyButtonFeedback(this.settingsButton)

    this.settingsButton.on(
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

  private applyIconContrast(icon: Phaser.GameObjects.Image): void {
    if (this.theme.id !== 'evil-forest') {
      return
    }
    icon.setTint(0x9ef1ff)
  }

  private applyHandednessLayout(): void {
    if (!this.settingsButton) {
      return
    }
    const iconSize = this.ui.icon.size
    const padding = this.ui.icon.padding
    const spacing = iconSize + 10
    const topY = 28 + this.safeArea.top
    const bottomY = GAME_DIMENSIONS.height - GROUND_HEIGHT - 26 - this.safeArea.bottom
    const leftX = padding + iconSize / 2 + this.safeArea.left
    const rightX = GAME_DIMENSIONS.width - padding - iconSize / 2 - this.safeArea.right
    const settingsOffset = spacing * 2.4

    if (this.handMode === 'normal') {
      this.settingsButton.setPosition(padding + 34, topY)
      this.motionIcon?.setPosition(rightX - spacing, topY)
      this.muteIcon?.setPosition(rightX, topY)
      return
    }

    const y = bottomY
    if (this.handMode === 'left') {
      this.settingsButton.setPosition(leftX + settingsOffset, y)
      this.motionIcon?.setPosition(leftX, y)
      this.muteIcon?.setPosition(leftX + spacing, y)
    } else {
      this.settingsButton.setPosition(rightX - settingsOffset, y)
      this.motionIcon?.setPosition(rightX - spacing, y)
      this.muteIcon?.setPosition(rightX, y)
    }
  }

  private createSettingsPanel(): void {
    const rows = [
      {
        label: 'MUTE',
        getValue: () => (this.isMuted ? 'ON' : 'OFF'),
        onToggle: () => this.toggleMute(),
      },
      {
        label: 'MOTION',
        getValue: () => (this.reducedMotion ? 'REDUCED' : 'FULL'),
        onToggle: () => this.toggleReducedMotion(),
      },
      {
        label: 'HAND',
        getValue: () => this.getHandednessLabel(),
        onToggle: () => this.toggleHandedness(),
      },
      {
        label: 'TEXT',
        getValue: () => this.getTextScaleLabel(),
        onToggle: () => this.toggleTextScale(),
      },
      {
        label: 'CONTRAST',
        getValue: () => this.getContrastLabel(),
        onToggle: () => this.toggleContrastMode(),
      },
      {
        label: 'ANALYTICS',
        getValue: () => this.getAnalyticsLabel(),
        onToggle: () => this.toggleAnalyticsConsent(),
      },
      ...(this.privacyPolicyUrl
        ? [
            {
              label: 'PRIVACY',
              getValue: () => 'OPEN',
              onToggle: () => this.openPrivacyPolicy(),
            },
          ]
        : []),
      {
        label: 'SEED',
        getValue: () => this.getSeedModeLabel(),
        onToggle: () => this.toggleSeedMode(),
      },
      {
        label: 'DIFFICULTY',
        getValue: () => this.getGameModeLabel(),
        onToggle: () => this.toggleGameMode(),
      },
      {
        label: 'PRACTICE',
        getValue: () => (this.practiceEnabled ? 'ON' : 'OFF'),
        onToggle: () => this.togglePracticeMode(),
      },
      {
        label: 'GHOST',
        getValue: () => (this.ghostEnabled ? 'ON' : 'OFF'),
        onToggle: () => this.toggleGhost(),
      },
      {
        label: 'THEME',
        getValue: () => this.theme.name,
        onToggle: () => this.toggleTheme(),
      },
    ]

    if (this.debugMenuEnabled) {
      rows.push({
        label: 'DEBUG',
        getValue: () => 'OPEN',
        onToggle: () => this.toggleDebugMenu(),
      })
    }

    if (this.debugToggleAllowed) {
      rows.push({
        label: 'HITBOXES',
        getValue: () => (this.debugEnabled ? 'ON' : 'OFF'),
        onToggle: () => this.toggleHitboxes(),
      })
    }

    if (!this.settingsBackdrop) {
      const backdrop = this.add
        .rectangle(0, 0, GAME_DIMENSIONS.width, GAME_DIMENSIONS.height, this.theme.paletteNum.shadow, 0.35)
        .setOrigin(0, 0)
        .setDepth(5.5)
        .setVisible(false)
      backdrop.setInteractive()
      backdrop.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation()
          if (this.settingsOpen) {
            this.toggleSettingsPanel()
          }
        },
      )
      backdrop.disableInteractive()
      this.settingsBackdrop = backdrop
    }

    this.settingsPanel = createSettingsPanel({
      scene: this,
      ui: this.ui,
      theme: this.theme,
      position: {
        x: GAME_DIMENSIONS.width / 2,
        y: GAME_DIMENSIONS.height / 2,
      },
      rows,
      onClose: () => this.toggleSettingsPanel(),
    })
    this.updateSettingsValues()
  }

  private createDebugMenu(): void {
    if (!this.debugMenuEnabled) {
      return
    }

    const panelWidth = Math.round(this.ui.panelSize.large.width * 0.82)
    const panelHeight = 170
    const backdrop = this.add
      .rectangle(0, 0, GAME_DIMENSIONS.width, GAME_DIMENSIONS.height, this.theme.paletteNum.shadow, 0.35)
      .setOrigin(0, 0)
      .setDepth(6.5)
      .setVisible(false)
    backdrop.setInteractive()
    backdrop.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation()
        if (this.debugMenuOpen) {
          this.toggleDebugMenu()
        }
      },
    )
    backdrop.disableInteractive()
    this.debugMenuBackdrop = backdrop

    const panel = createPanel(this, this.ui, this.theme, 'large', panelWidth, panelHeight)
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

    const title = this.add.text(0, -50, 'DEBUG', this.ui.overlayTitleStyle).setOrigin(0.5, 0.5)
    const body = this.add
      .text(0, -12, 'Dev-only tools for local save data.', this.ui.overlayBodyStyle)
      .setOrigin(0.5, 0.5)
    body.setWordWrapWidth(panelWidth - 30)

    const resetButton = createSmallButton(this, this.ui, this.theme, 'RESET SAVE', () =>
      this.resetSaveState(),
    )
    const closeButton = createSmallButton(this, this.ui, this.theme, 'CLOSE', () =>
      this.toggleDebugMenu(),
    )
    resetButton.setPosition(-70, 48)
    closeButton.setPosition(70, 48)

    const content = this.add.container(GAME_DIMENSIONS.width / 2, GAME_DIMENSIONS.height / 2, [
      panel,
      title,
      body,
      resetButton,
      closeButton,
    ])

    this.debugMenu = this.add.container(0, 0, [backdrop, content])
    this.debugMenu.setDepth(7)
    this.debugMenu.setVisible(false)
  }

  private toggleDebugMenu(): void {
    if (!this.debugMenuEnabled || !this.debugMenu) {
      return
    }
    this.debugMenuOpen = !this.debugMenuOpen
    this.debugMenu.setVisible(this.debugMenuOpen)
    if (this.debugMenuBackdrop) {
      this.debugMenuBackdrop.setVisible(this.debugMenuOpen)
      if (this.debugMenuOpen) {
        this.debugMenuBackdrop.setInteractive()
      } else {
        this.debugMenuBackdrop.disableInteractive()
      }
    }
    if (this.debugMenuOpen && this.settingsOpen) {
      this.toggleSettingsPanel()
    }
  }

  private resetSaveState(): void {
    if (!this.saveSystem) {
      return
    }
    const reset = this.saveSystem.reset()
    this.coinsEarned = 0
    this.totalCoins = reset.coins
    if (this.coinsEarnedText) {
      this.coinsEarnedText.setText('0')
    }
    if (this.totalCoinsText) {
      this.totalCoinsText.setText(String(this.totalCoins))
    }
    this.analyticsSystem.track('save_reset')
  }

  private createTelemetryConsentOverlay(): void {
    if (import.meta.env.DEV || !telemetryHasProviders || this.analyticsConsent !== null) {
      return
    }

    const panelWidth = this.ui.panelSize.large.width
    const panelHeight = 160

    const blocker = this.add
      .rectangle(0, 0, GAME_DIMENSIONS.width, GAME_DIMENSIONS.height, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setInteractive()
    blocker.on(
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

    const panel = createPanel(this, this.ui, this.theme, 'large', panelWidth, panelHeight)

    const title = this.add
      .text(0, -50, 'ANALYTICS', this.ui.overlayTitleStyle)
      .setOrigin(0.5, 0.5)

    const body = this.add
      .text(0, -12, 'Help improve the game with anonymous gameplay events.', this.ui.overlayBodyStyle)
      .setOrigin(0.5, 0.5)
    body.setWordWrapWidth(panelWidth - 30)

    const allowButton = createSmallButton(this, this.ui, this.theme, 'ALLOW', () =>
      this.setAnalyticsConsent('granted'),
    )
    const declineButton = createSmallButton(this, this.ui, this.theme, 'DECLINE', () =>
      this.setAnalyticsConsent('denied'),
    )
    allowButton.setPosition(-70, 48)
    declineButton.setPosition(70, 48)

    const content = this.add.container(GAME_DIMENSIONS.width / 2, GAME_DIMENSIONS.height / 2, [
      panel,
      title,
      body,
      allowButton,
      declineButton,
    ])

    this.telemetryConsentPanel = this.add.container(0, 0, [blocker, content])
    this.telemetryConsentPanel.setDepth(7)
    this.showTelemetryConsentOverlay(true)
  }

  private showTelemetryConsentOverlay(visible: boolean): void {
    if (!this.telemetryConsentPanel) {
      return
    }
    this.telemetryConsentOpen = visible
    this.telemetryConsentPanel.setVisible(visible)
    if (visible && this.settingsOpen) {
      this.toggleSettingsPanel()
    }
  }

  private toggleSettingsPanel(): void {
    this.settingsOpen = !this.settingsOpen
    this.settingsPanel.setVisible(this.settingsOpen)
    if (this.settingsBackdrop) {
      this.settingsBackdrop.setVisible(this.settingsOpen)
      if (this.settingsOpen) {
        this.settingsBackdrop.setInteractive()
      } else {
        this.settingsBackdrop.disableInteractive()
      }
    }
    if (this.settingsOpen) {
      this.updateSettingsValues()
    }
  }

  private createParticles(): void {
    this.clearParticles()
    if (this.isMotionReduced()) {
      return
    }
    const particles = this.theme.visuals.particles
    if (!particles || !this.theme.assets.atlas) {
      return
    }

    if (this.theme.id === 'evil-forest' && this.environmentConfig) {
      const envParticles = this.environmentConfig.particles
      if (envParticles.embers && particles.ember) {
        this.createEmitterFromEnv(particles.ember, envParticles.embers, this.theme.assets.atlas.key)
      }
      if (envParticles.dust && particles.dust) {
        this.createEmitterFromEnv(particles.dust, envParticles.dust, this.theme.assets.atlas.key)
      }
      if (envParticles.leaf && particles.leaf) {
        this.createEmitterFromEnv(particles.leaf, envParticles.leaf, this.theme.assets.atlas.key)
      }
      if (envParticles.fireflies && particles.ember) {
        this.createEmitterFromEnv(particles.ember, envParticles.fireflies, this.theme.assets.atlas.key)
      }
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
    this.particleManagers.push(emitter)
  }

  private createEmitterFromEnv(frame: string, config: ParticleConfig, atlasKey: string): void {
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
    const areaRects = config.areas
      ? config.areas.map(
          (area) => new Phaser.Geom.Rectangle(area.x, area.y, area.width, area.height),
        )
      : null
    const emitZone = new Phaser.GameObjects.Particles.Zones.RandomZone({
      getRandomPoint: (point) => {
        const rect =
          areaRects && areaRects.length
            ? areaRects[Math.floor(Math.random() * areaRects.length)]
            : zoneRect
        rect.getRandomPoint(scratchPoint)
        point.x = scratchPoint.x
        point.y = scratchPoint.y
      },
    })

    let blendMode = Phaser.BlendModes.NORMAL
    if (config.blendMode === 'add') {
      blendMode = Phaser.BlendModes.ADD
    }

    const emitter = this.add.particles(0, 0, atlasKey, {
      frame,
      maxParticles: config.maxParticles,
      quantity: 1,
      frequency: config.frequency,
      lifespan: { min: config.lifespanMin, max: config.lifespanMax },
      speedX: { min: -config.speedMax, max: -config.speedMin },
      speedY: { min: config.driftMin, max: config.driftMax },
      scale: { min: config.scaleMin, max: config.scaleMax },
      alpha: { min: config.alphaMin, max: config.alphaMax },
      emitZone,
      blendMode,
      tint: config.tint,
    })
    emitter.setDepth(1.1)
    this.particleManagers.push(emitter)
  }

  private clearParticles(): void {
    if (!this.particleManagers.length) {
      return
    }
    this.particleManagers.forEach((manager) => manager.destroy())
    this.particleManagers = []
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

  private createImpactFx(): void {
    this.screenFlash?.destroy()
    this.impactBurst?.destroy()

    this.screenFlash = new ScreenFlash(this, this.fx.screenFlash)
    this.screenFlash.setEnabled(!this.isMotionReduced())

    const particles = this.theme.visuals.particles
    const particleFrame = particles?.ember ?? particles?.dust ?? particles?.leaf
    const atlasKey = this.theme.assets.atlas?.key

    this.impactBurst = new ImpactBurst(this, this.fx.impactBurst, {
      atlasKey,
      frame: particleFrame,
      blendMode: Phaser.BlendModes.ADD,
    })
    this.impactBurst.setEnabled(!this.isMotionReduced())
  }

  private createDebugOverlay(): void {
    this.debugGraphics = this.add.graphics().setDepth(10)
    this.debugGraphics.setVisible(this.debugEnabled)
  }

  private createEnvDebugOverlay(): void {
    if (!this.debugToggleAllowed) {
      return
    }
    const style = {
      ...this.ui.statLabelStyle,
      fontSize: '11px',
      color: this.ui.statValueStyle.color,
    }
    this.envDebugText = this.add.text(8, 8, '', style).setDepth(10)
    this.envDebugText.setBackgroundColor('rgba(6, 8, 14, 0.55)')
    this.envDebugText.setPadding(6, 4, 6, 4)
    this.envDebugText.setVisible(this.envDebugEnabled)
    this.updateEnvDebugOverlay()
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
    storeBool('flappy-hitboxes', this.debugEnabled)
    this.updateSettingsValues()
  }

  private toggleEnvDebugOverlay(): void {
    if (!this.debugToggleAllowed) {
      return
    }
    this.envDebugEnabled = !this.envDebugEnabled
    if (this.envDebugText) {
      this.envDebugText.setVisible(this.envDebugEnabled)
    }
    storeBool('flappy-env-debug', this.envDebugEnabled)
  }

  private enterReady(): void {
    this.resetWorld()
    this.setBirdVisual('idle')
    this.showReadyOverlay(true)
    this.showGameOverOverlay(false)
    this.runStartMs = null
    this.e2eAutoplay = this.e2eEnabled
    this.ghostPlayer?.stop()
    this.replayRecorder = null
    telemetry.track('game_ready_shown')
    this.setE2EState({
      state: 'READY',
      score: this.scoreSystem.score,
      bestScore: this.bestScore,
      seedMode: this.seedMode,
      seedLabel: this.seedLabel,
      gameMode: this.gameModeId,
      practiceEnabled: this.practiceEnabled,
      reducedMotion: this.reducedMotion,
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
    this.startReplayRecording()
    this.startGhostPlayback()
    this.cameraPunch(0.6)
    telemetry.track('game_start')
    this.analyticsSystem.track('run_start', {
      mode: this.gameModeId,
      seedMode: this.seedMode,
      seedLabel: this.seedLabel,
      practiceEnabled: this.practiceEnabled,
    })
    telemetry.track('flap')
    this.setE2EState({ state: 'PLAYING' })
    this.bird.flap()
  }

  private restart(): void {
    this.stateMachine.transition('RESTART')
    telemetry.track('restart')
    this.analyticsSystem.track('run_restart')
    this.enterReady()
  }

  private updatePlaying(dt: number, dtMs: number): void {
    const hitGround = this.bird.update(dt, this.ground.y)
    this.updateBirdVisual(dt)
    if (this.practiceInvulnMs > 0) {
      this.practiceInvulnMs = Math.max(0, this.practiceInvulnMs - dtMs)
    }

    const tuning = this.getDifficultyTuning()
    this.speedScale = tuning.speedScale
    this.currentGap = tuning.gap
    this.backgroundSystem?.setSpeedScale(this.speedScale)

    this.spawnSystem.update(dtMs, this.handleSpawn, this.currentGap)
    this.ghostPlayer?.update(dtMs, this.ground.y)

    this.obstacleSwayClock += dtMs
    this.obstacleVariantSystem?.update(dtMs)

    for (let i = 0; i < this.pipes.length; i += 1) {
      const pipe = this.pipes[i]
      const sprites = this.pipeSprites[i]
      const variant = this.pipeVariants[i]
      if (variant && this.obstacleVariantSystem) {
        this.obstacleVariantSystem.applyVariant(pipe, variant, this.currentGap)
      }
      pipe.update(dt, PIPE_CONFIG.speed * this.speedScale)
      this.updatePipeSprites(pipe, sprites)
    }

    this.despawnSystem.update(this.pipes, this.pipePool, this.handleDespawn)

    const canCollide = !this.practiceEnabled || this.practiceInvulnMs <= 0
    const hitObstacle =
      canCollide && this.collisionSystem.check(this.bird, this.pipes, this.ground.y)
    if (canCollide && (hitGround || hitObstacle)) {
      if (this.practiceEnabled) {
        // Practice mode keeps the run alive and repositions the bird.
        this.handlePracticeHit()
      } else {
        this.triggerGameOver()
      }
    }

    this.scoreSystem.update(this.bird.x, this.pipes)
    if (this.scoreSystem.score !== this.lastScore) {
      if (this.practiceEnabled && this.practiceInvulnMs <= 0) {
        const checkpoint = this.getLatestScoredGapY()
        if (checkpoint !== null) {
          this.practiceCheckpointY = checkpoint
        }
      }
      this.lastScore = this.scoreSystem.score
      this.scoreText.setText(String(this.scoreSystem.score))
      this.pulseScore()
      this.screenFlash?.flash(0.4)
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

    if (!this.isMotionReduced()) {
      this.cameras.main.shake(this.fx.screenShake.duration, this.fx.screenShake.intensity)
    }
    this.cameraPunch(1)
    this.screenFlash?.flash(1)
    this.impactBurst?.burst(this.bird.x, this.bird.y)

    const score = this.scoreSystem.score
    const isNewBest = score > this.bestScore
    if (isNewBest) {
      this.bestScore = score
      this.storeBestScore(score)
    }
    this.finishReplayRecording(isNewBest)
    this.ghostPlayer?.stop()

    const coinsEarned = this.practiceEnabled ? 0 : this.currencySystem.calculateCoins(score)
    this.coinsEarned = coinsEarned
    if (!this.practiceEnabled) {
      if (this.saveSystem) {
        const updated = this.saveSystem.update((state) => ({
          ...state,
          coins: state.coins + coinsEarned,
          lifetime: {
            runs: state.lifetime.runs + 1,
            bestScore: Math.max(state.lifetime.bestScore, score),
            totalCoinsEarned: state.lifetime.totalCoinsEarned + coinsEarned,
          },
        }))
        this.totalCoins = updated.coins
      } else {
        this.totalCoins += coinsEarned
      }
    }

    this.finalScoreText.setText(String(score))
    this.bestScoreText.setText(String(this.bestScore))
    this.bestLabelText.setText(isNewBest ? 'NEW BEST' : 'BEST')
    this.coinsEarnedText.setText(String(this.coinsEarned))
    this.totalCoinsText.setText(String(this.totalCoins))
    this.updateMedal(score)

    const sessionDurationMs =
      this.runStartMs === null ? 0 : Math.max(0, this.time.now - this.runStartMs)
    telemetry.track('game_over', {
      score,
      bestScore: this.bestScore,
      sessionDurationMs: Math.round(sessionDurationMs),
    })
    this.analyticsSystem.track('run_end', {
      score,
      bestScore: this.bestScore,
      sessionDurationMs: Math.round(sessionDurationMs),
    })
    if (!this.practiceEnabled) {
      this.analyticsSystem.track('coins_earned', {
        coins: this.coinsEarned,
        totalCoins: this.totalCoins,
      })
    }
    this.runStartMs = null
    this.setE2EState({
      state: 'GAME_OVER',
      score,
      bestScore: this.bestScore,
      seedMode: this.seedMode,
      seedLabel: this.seedLabel,
      gameMode: this.gameModeId,
      practiceEnabled: this.practiceEnabled,
      reducedMotion: this.reducedMotion,
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
    this.obstacleVariantSystem?.reset()
    this.practiceInvulnMs = 0
    this.practiceCheckpointY = BIRD_CONFIG.startY
    this.updateBirdVisual(0)
    this.speedScale = 1
    this.currentGap = PIPE_CONFIG.gap
    this.backgroundSystem?.setSpeedScale(1)

    for (let i = this.pipes.length - 1; i >= 0; i -= 1) {
      this.pipePool.push(this.pipes[i])
      const sprites = this.pipeSprites[i]
      sprites.top.setVisible(false)
      sprites.bottom.setVisible(false)
      this.pipeSpritePool.push(sprites)
    }
    this.pipes.length = 0
    this.pipeSprites.length = 0
    this.pipeVariants.length = 0

    this.spawnSystem.reset()
    this.scoreSystem.reset()
    this.lastScore = -1
    this.scoreText.setText('0')
  }

  private spawnPipePair(gapCenterY: number): void {
    const spawnX = GAME_DIMENSIONS.width + PIPE_CONFIG.width
    const pipe = this.pipePool.pop() ?? new PipePair(spawnX, gapCenterY)
    pipe.reset(spawnX, gapCenterY, this.currentGap)
    this.pipes.push(pipe)

    const variant =
      this.obstacleVariantSystem?.createVariant(gapCenterY) ?? {
        kind: 'static',
        baseGapY: gapCenterY,
        gapMultiplier: 1,
        offsetAmplitude: 0,
        offsetSpeed: 0,
        offsetPhase: 0,
        gapPulseAmplitude: 0,
        gapPulseSpeed: 0,
        gapPulsePhase: 0,
      }
    this.pipeVariants.push(variant)
    if (this.obstacleVariantSystem) {
      this.obstacleVariantSystem.applyVariant(pipe, variant, this.currentGap)
    }

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

    let topGlow: Phaser.GameObjects.Image | undefined
    let bottomGlow: Phaser.GameObjects.Image | undefined
    if (this.theme.id === 'evil-forest') {
      topGlow = this.add
        .image(0, 0, obstacles.key, obstacles.topKey ?? obstacles.topFrames?.[0])
        .setOrigin(0, 1)
        .setDepth(1.05)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setAlpha(0.26)
        .setTint(0x9ef1ff)
      bottomGlow = this.add
        .image(0, 0, obstacles.key, obstacles.bottomKey ?? obstacles.bottomFrames?.[0])
        .setOrigin(0, 0)
        .setDepth(1.05)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setAlpha(0.26)
        .setTint(0x9ef1ff)
      if (obstacles.type === 'image' && obstacles.flipTop) {
        topGlow.setFlipY(true)
      }
    }

    return { top, bottom, topGlow, bottomGlow }
  }

  private applyObstacleVariant(sprites: PipeSprites): void {
    const obstacles = this.theme.visuals.obstacles
    if (obstacles.type !== 'atlas' || !obstacles.topFrames || !obstacles.bottomFrames) {
      return
    }
    const variantIndex = this.nextObstacleVariant()
    const topFrame = obstacles.topFrames[variantIndex]
    const bottomFrame = obstacles.bottomFrames[variantIndex]
    sprites.top.setTexture(obstacles.key, topFrame)
    sprites.bottom.setTexture(obstacles.key, bottomFrame)
    sprites.topGlow?.setTexture(obstacles.key, topFrame)
    sprites.bottomGlow?.setTexture(obstacles.key, bottomFrame)
  }

  private updatePipeSprites(pipe: PipePair, sprites: PipeSprites): void {
    const topHeight = Math.max(0, pipe.topHeight)
    const bottomHeight = Math.max(0, pipe.bottomHeight)

    const motionReduced = this.isMotionReduced()
    const swayPhase = motionReduced ? 0 : this.obstacleSwayClock * this.fx.obstacleSway.speed
    const sway =
      motionReduced ? 0 : Math.sin((pipe.x + swayPhase) * 0.01) * this.fx.obstacleSway.amplitude

    sprites.top.setPosition(pipe.x, topHeight)
    sprites.top.setDisplaySize(PIPE_CONFIG.width, topHeight)
    sprites.top.setRotation(-sway)
    sprites.top.setVisible(topHeight > 0)
    if (sprites.topGlow) {
      sprites.topGlow.setPosition(pipe.x - 2, topHeight)
      sprites.topGlow.setDisplaySize(PIPE_CONFIG.width + 4, topHeight + 4)
      sprites.topGlow.setRotation(-sway)
      sprites.topGlow.setVisible(topHeight > 0)
    }

    sprites.bottom.setPosition(pipe.x, pipe.bottomY)
    sprites.bottom.setDisplaySize(PIPE_CONFIG.width, bottomHeight)
    sprites.bottom.setRotation(sway)
    sprites.bottom.setVisible(bottomHeight > 0)
    if (sprites.bottomGlow) {
      sprites.bottomGlow.setPosition(pipe.x - 2, pipe.bottomY)
      sprites.bottomGlow.setDisplaySize(PIPE_CONFIG.width + 4, bottomHeight + 4)
      sprites.bottomGlow.setRotation(sway)
      sprites.bottomGlow.setVisible(bottomHeight > 0)
    }
  }

  private updateBirdVisual(dt: number): void {
    if (this.stateMachine.state === 'READY' && !this.isMotionReduced()) {
      this.birdBobTime += dt * this.fx.readyBob.speed
    }

    const bobOffset =
      this.stateMachine.state === 'READY' && !this.isMotionReduced()
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
    if (this.isMotionReduced()) {
      container.setAlpha(1)
      container.setScale(1)
      return
    }

    const tweenRef = kind === 'ready' ? this.readyTween : this.gameOverTween
    tweenRef?.stop()

    container.setAlpha(0)
    const bounceEnabled = this.fx.overlayBounce.enabled
    container.setScale(bounceEnabled ? this.fx.overlayBounce.startScale : 0.98)

    const tween = this.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: bounceEnabled ? this.fx.overlayBounce.durationMs : 220,
      ease: bounceEnabled ? 'Back.Out' : 'Sine.Out',
    })

    if (kind === 'ready') {
      this.readyTween = tween
    } else {
      this.gameOverTween = tween
    }
  }

  private pulseScore(): void {
    if (this.isMotionReduced()) {
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
    storeBool('flappy-muted', this.isMuted)
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
    storeBool('flappy-reduced-motion', this.reducedMotion)
    this.backgroundSystem?.setReducedMotion(this.isMotionReduced())

    if (this.isMotionReduced()) {
      this.readyTween?.stop()
      this.gameOverTween?.stop()
      this.scorePulseTween?.stop()
      this.cameraPunchTween?.stop()
      this.cameras.main.setZoom(1)
      this.scoreFrame.setScale(1)
      this.scoreText.setScale(1)
      this.clearParticles()
      this.screenFlash?.setEnabled(false)
      this.impactBurst?.setEnabled(false)
    } else {
      this.createParticles()
      this.screenFlash?.setEnabled(true)
      this.impactBurst?.setEnabled(true)
    }
    this.setE2EState({ reducedMotion: this.reducedMotion })
    this.updateSettingsValues()
  }

  private toggleHandedness(): void {
    this.handMode = getNextHandedness(this.handMode)
    storeHandedness(this.handMode)
    this.applyHandednessLayout()
    this.updateSettingsValues()
  }

  private toggleTextScale(): void {
    if (typeof window === 'undefined') {
      return
    }
    this.textScale = getNextTextScale(this.textScale)
    storeTextScale(this.textScale)
    window.location.reload()
  }

  private toggleContrastMode(): void {
    if (typeof window === 'undefined') {
      return
    }
    this.contrastMode = getNextContrastMode(this.contrastMode)
    storeContrastMode(this.contrastMode)
    window.location.reload()
  }

  private setAnalyticsConsent(consent: 'granted' | 'denied'): void {
    this.analyticsConsent = consent
    setTelemetryConsent(consent)
    this.updateSettingsValues()
    this.showTelemetryConsentOverlay(false)
  }

  private toggleSeedMode(): void {
    if (typeof window === 'undefined') {
      return
    }
    const url = new URL(window.location.href)
    if (this.seedMode === 'daily') {
      url.searchParams.delete('daily')
    } else {
      url.searchParams.set('daily', '1')
      url.searchParams.delete('seed')
    }
    window.location.href = url.toString()
  }

  private toggleGameMode(): void {
    if (this.stateMachine.state === 'PLAYING') {
      return
    }
    const next = getNextGameModeId(this.gameModeId)
    this.applyGameMode(next)
    if (this.stateMachine.state === 'GAME_OVER') {
      this.restart()
    } else if (this.stateMachine.state === 'READY') {
      this.enterReady()
    }
  }

  private togglePracticeMode(): void {
    this.practiceEnabled = !this.practiceEnabled
    storeBool('flappy-practice', this.practiceEnabled)
    this.practiceInvulnMs = 0
    this.practiceCheckpointY = BIRD_CONFIG.startY
    if (this.practiceEnabled) {
      this.ghostPlayer?.stop()
      this.replayRecorder = null
    }
    this.setE2EState({ practiceEnabled: this.practiceEnabled })
    if (this.stateMachine.state === 'PLAYING' || this.stateMachine.state === 'GAME_OVER') {
      this.enterReady()
      return
    }
    this.updateSettingsValues()
  }

  private applyGameMode(modeId: GameModeId): void {
    this.gameModeId = modeId
    this.gameMode = getGameModeConfig(modeId)
    storeString('flappy-mode', modeId)
    this.bestScore = this.readBestScore()
    if (this.bestScoreText) {
      this.bestScoreText.setText(String(this.bestScore))
    }
    if (this.bestLabelText) {
      this.bestLabelText.setText('BEST')
    }
    this.bestReplay = loadBestReplay(this.gameModeId)
    this.setE2EState({ gameMode: this.gameModeId })
    this.updateSettingsValues()
  }

  private getSeedModeLabel(): string {
    if (this.seedMode === 'daily') {
      return 'DAILY'
    }
    if (this.seedMode === 'custom') {
      return this.formatSeedLabel(this.seedLabel)
    }
    return 'NORMAL'
  }

  private getGameModeLabel(): string {
    return this.gameMode.label
  }

  private getHandednessLabel(): string {
    if (this.handMode === 'left') {
      return 'LEFT'
    }
    if (this.handMode === 'right') {
      return 'RIGHT'
    }
    return 'NORMAL'
  }

  private getTextScaleLabel(): string {
    return `${Math.round(this.textScale * 100)}%`
  }

  private getContrastLabel(): string {
    return this.contrastMode === 'high' ? 'HIGH' : 'NORMAL'
  }

  private handlePracticeHit(): void {
    this.practiceInvulnMs = PRACTICE_CONFIG.invulnerabilityMs
    this.bird.reset(this.practiceCheckpointY)
    this.setBirdVisual('flap')
  }

  private cameraPunch(intensity: number): void {
    if (this.isMotionReduced() || !this.fx.cameraPunch.enabled) {
      return
    }
    const amount = this.fx.cameraPunch.amount * intensity
    if (amount <= 0) {
      return
    }
    this.cameraPunchTween?.stop()
    this.cameras.main.setZoom(1)
    this.cameraPunchTween = this.tweens.add({
      targets: this.cameras.main,
      zoom: 1 + amount,
      duration: this.fx.cameraPunch.durationMs,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => {
        this.cameras.main.setZoom(1)
      },
    })
  }

  private getLatestScoredGapY(): number | null {
    let latestX = Number.NEGATIVE_INFINITY
    let gapY: number | null = null
    for (const pipe of this.pipes) {
      if (pipe.scored && pipe.x > latestX) {
        latestX = pipe.x
        gapY = pipe.gapY
      }
    }
    return gapY
  }

  private formatSeedLabel(label: string): string {
    const max = 10
    if (label.length <= max) {
      return label
    }
    return `${label.slice(0, max - 3)}...`
  }

  private getAnalyticsLabel(): string {
    if (!telemetryHasProviders) {
      return 'OFF'
    }
    if (this.analyticsConsent === 'granted') {
      return 'ON'
    }
    if (this.analyticsConsent === 'denied') {
      return 'OFF'
    }
    return 'ASK'
  }

  private toggleAnalyticsConsent(): void {
    if (!telemetryHasProviders) {
      return
    }
    const next = this.analyticsConsent === 'granted' ? 'denied' : 'granted'
    this.setAnalyticsConsent(next)
  }

  private openPrivacyPolicy(): void {
    if (typeof window === 'undefined') {
      return
    }
    if (!this.privacyPolicyUrl || !this.privacyPolicyUrl.startsWith('http')) {
      return
    }
    try {
      const opened = window.open(this.privacyPolicyUrl, '_blank', 'noopener,noreferrer')
      if (!opened) {
        window.location.href = this.privacyPolicyUrl
      }
    } catch {
      window.location.href = this.privacyPolicyUrl
    }
  }

  private updateSafeAreaLayout(): void {
    const { top, right, bottom, left } = this.readSafeAreaInsets()
    const canvas = this.game.canvas
    const scaleX = canvas?.clientWidth ? canvas.clientWidth / GAME_DIMENSIONS.width : 1
    const scaleY = canvas?.clientHeight ? canvas.clientHeight / GAME_DIMENSIONS.height : 1
    this.safeArea = {
      top: top / scaleY,
      right: right / scaleX,
      bottom: bottom / scaleY,
      left: left / scaleX,
    }

    const scoreY = this.ui.score.y + this.safeArea.top
    this.scoreFrame?.setPosition(this.ui.score.x, scoreY)
    this.scoreText?.setPosition(this.ui.score.x, scoreY + 2)
    this.applyHandednessLayout()
    this.updateOverlayLayout()
  }

  private readSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 }
    }
    const style = getComputedStyle(document.documentElement)
    const parse = (value: string): number => {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return {
      top: parse(style.getPropertyValue('--safe-area-top')),
      right: parse(style.getPropertyValue('--safe-area-right')),
      bottom: parse(style.getPropertyValue('--safe-area-bottom')),
      left: parse(style.getPropertyValue('--safe-area-left')),
    }
  }

  private updateOverlayLayout(): void {
    const offsetX = (this.safeArea.left - this.safeArea.right) / 2
    const offsetY = (this.safeArea.top - this.safeArea.bottom) / 2

    if (this.readyContainer) {
      this.readyContainer.setPosition(
        this.ui.layout.ready.x + offsetX,
        this.ui.layout.ready.y + offsetY,
      )
    }
    if (this.gameOverContainer) {
      this.gameOverContainer.setPosition(
        this.ui.layout.gameOver.x + offsetX,
        this.ui.layout.gameOver.y + offsetY,
      )
    }
  }

  private toggleGhost(): void {
    this.ghostEnabled = !this.ghostEnabled
    storeBool('flappy-ghost', this.ghostEnabled)
    if (!this.ghostEnabled) {
      this.ghostPlayer?.stop()
    }
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

  private shareRunCard(): void {
    if (typeof window === 'undefined') {
      return
    }
    const sourceCanvas = this.game.canvas
    if (!sourceCanvas) {
      return
    }

    const shareUrl = buildShareUrl(window.location.href, this.seedMode, this.seedLabel)
    const card = createShareCardCanvas({
      sourceCanvas,
      theme: this.theme,
      score: this.scoreSystem.score,
      bestScore: this.bestScore,
      seedLabel: this.seedLabel,
      seedMode: this.seedMode,
      gameModeLabel: this.gameMode.label,
      practiceEnabled: this.practiceEnabled,
      shareUrl,
    })
    if (!card) {
      return
    }

    downloadShareCard(card, this.buildShareFilename())
    void copyShareUrl(shareUrl)
  }

  private buildShareFilename(): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    return `flappy-run-${timestamp}.png`
  }

  private updateSettingsValues(): void {
    this.settingsPanel.updateValues()
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
    const win = window as Window & {
      __flappyDebug?: E2EDebugState
      __forceLowPower?: () => void
      __clearLowPower?: () => void
    }
    if (!win.__flappyDebug) {
      win.__flappyDebug = {
        state: this.stateMachine.state,
        score: this.scoreSystem.score,
        bestScore: this.bestScore,
        seedMode: this.seedMode,
        seedLabel: this.seedLabel,
        gameMode: this.gameModeId,
        practiceEnabled: this.practiceEnabled,
        reducedMotion: this.reducedMotion,
      }
    }
    Object.assign(win.__flappyDebug, partial)
    if (this.debugToggleAllowed || this.e2eEnabled) {
      if (!win.__forceLowPower) {
        win.__forceLowPower = () => this.setLowPowerMode(true)
        win.__clearLowPower = () => this.setLowPowerMode(false)
      }
    }
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

  private updateEnvDebugOverlay(): void {
    if (!this.envDebugEnabled || !this.envDebugText) {
      return
    }

    const fps = this.game.loop?.actualFps ? Math.round(this.game.loop.actualFps) : 0
    const lines = [
      `ENV: ${this.environmentConfig ? this.environmentConfig.label : this.theme.name}`,
      `FPS: ${fps}`,
      `PIPES: ${this.pipes.length}`,
    ]
    if (this.perfLowPower) {
      lines.push('PERF: LOW')
    }
    if (this.backgroundSystem) {
      lines.push(...this.backgroundSystem.getDebugLines())
    }
    this.envDebugText.setText(lines.join('\n'))
  }

  private readQueryParam(key: string): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get(key)
    } catch {
      return null
    }
  }

  private getBestScoreKey(modeId: GameModeId = this.gameModeId): string {
    return `flappy-best-${modeId}`
  }

  private readBestScore(): number {
    const raw = readStoredString(this.getBestScoreKey())
    if (raw !== null) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
    if (this.gameModeId === DEFAULT_GAME_MODE) {
      return readStoredNumber('flappy-best', 0)
    }
    return 0
  }

  private storeBestScore(score: number): void {
    storeNumber(this.getBestScoreKey(), score)
    if (this.gameModeId === DEFAULT_GAME_MODE) {
      storeNumber('flappy-best', score)
    }
  }

  private startReplayRecording(): void {
    if (this.practiceEnabled) {
      this.replayRecorder = null
      return
    }
    this.replayRecorder = new ReplayRecorder({
      seed: this.seedValue,
      seedLabel: this.seedLabel,
      mode: this.seedMode,
      preset: this.gameModeId,
    })
    this.replayRecorder.start(this.time.now)
    this.replayRecorder.recordFlap(this.time.now)
  }

  private finishReplayRecording(isNewBest: boolean): void {
    if (this.practiceEnabled) {
      this.replayRecorder = null
      return
    }
    if (!this.replayRecorder) {
      return
    }
    const replay = this.replayRecorder.finish(this.time.now, this.scoreSystem.score)
    this.replayRecorder = null
    if (!replay) {
      return
    }
    if (isNewBest || !this.bestReplay || replay.score >= this.bestReplay.score) {
      saveBestReplay(this.gameModeId, replay)
      this.bestReplay = replay
    }
  }

  private startGhostPlayback(): void {
    if (this.practiceEnabled || !this.ghostEnabled || !this.bestReplay || !this.ghostPlayer) {
      return
    }
    if (!this.isReplayCompatible(this.bestReplay)) {
      return
    }
    this.ghostPlayer.start(this.bestReplay)
  }

  private isReplayCompatible(replay: ReplayData): boolean {
    const preset = replay.preset ?? DEFAULT_GAME_MODE
    if (preset !== this.gameModeId) {
      return false
    }
    if (replay.mode !== this.seedMode) {
      return false
    }
    if (replay.seed === null) {
      return true
    }
    return replay.seed === this.seedValue
  }

}
