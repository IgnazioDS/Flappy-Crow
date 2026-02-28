import Phaser from 'phaser'
import { GAME_DIMENSIONS } from '../config'
import { BackgroundSystem } from '../systems/BackgroundSystem'
import type { EnvironmentConfig, EnvironmentFogLayer } from '../theme/env/types'
import { V2_SANITIZE_MANIFEST } from '../graphics/TextureSanitizer'

/**
 * Key for the programmatically-generated vignette canvas texture.
 * Created once on first `create()` and reused across environment switches.
 */
const VIGNETTE_TEX_KEY = 'v2-vignette-tex'

/**
 * Key for the full-screen grade overlay canvas texture.
 * Cool blue-purple tint + edge-darkening contrast curve.
 * Created once per session; alpha is controlled per-sprite, not baked in.
 */
const GRADE_TEX_KEY = 'v2-grade-tex'

/**
 * Key for the tileable 256×256 film-grain noise canvas texture.
 * Created once; the TileSprite drifts its tile position each frame.
 */
const GRAIN_TEX_KEY = 'v2-grain-tex'

/**
 * Key for the tileable 128×64 water-specular streak canvas texture.
 * Created once; the TileSprite scrolls slowly over the swamp region.
 */
const SHIMMER_TEX_KEY = 'v2-water-specular'

/**
 * Key for the 16×16 radial-gradient sparkle dot canvas texture.
 * Used by biolume sparkle particle emitters.
 */
const SPARKLE_DOT_KEY = 'v2-sparkle-dot'

/**
 * Depth of the background vignette — above all background layers (max 0.84)
 * but below gameplay elements (pipes/obstacles at 1.0, bird at 2.0).
 */
const VIGNETTE_DEPTH = 0.92

/**
 * Key for the programmatically-generated bottom-fog scrim canvas texture.
 * A vertical dark-to-transparent gradient that covers the bottom 18% of the
 * game canvas (≈115 px) to ground the swamp visually and hide any hard seam
 * between the bg layers and the ground sprite.
 */
const BOTTOM_SCRIM_TEX_KEY = 'v2-bottom-scrim'

/** Render depth: above all background layers (max 0.84), below vignette (0.92). */
const BOTTOM_SCRIM_DEPTH = 0.91

/** Height of the scrim in game pixels — ~20% of GAME_DIMENSIONS.height (640). */
const BOTTOM_SCRIM_H = 128

/**
 * Key for the programmatic bank-haze canvas texture.
 * A subtle horizontal violet-blue gradient centred at the waterline that
 * blends the swamp-near layer into the ground sprite.
 */
const BANK_HAZE_TEX_KEY = 'v2-bank-haze'

/** Render depth: above swamp_near (0.66), below shimmer (0.70). */
const BANK_HAZE_DEPTH = 0.685

/** Height of the bank-haze stripe in game pixels. */
const BANK_HAZE_H = 90

/**
 * V2_SANITIZE_MANIFEST is imported from TextureSanitizer so the thresholds
 * used in the QA corner-α overlay always match what BootScene actually applies.
 * (Previously a local SANITIZE_TARGETS copy — removed in v6.1.8 to prevent drift.)
 */

/**
 * BackgroundSystemV2 — extends BackgroundSystem with V2-specific features:
 *
 * COMPOSITION
 * • Vignette (0.92): soft radial canvas vignette for cinematic framing.
 * • Grade (3.50): full-screen cool-blue tint + edge-darkening overlay.
 * • Grain (3.51): slow-scrolling 256×256 film-grain TileSprite.
 * • Water shimmer (0.70): specular-streak TileSprite masked to swamp channels.
 * • Biolume sparkles (0.73): localized ADD-blend micro-particles per patch.
 *
 * OBSERVABILITY
 * • `getDebugLines()` returns a rich QA overlay covering envKey, all layer
 *   parallax speeds, fog alpha/speed/tint/drift, biolume info, configured
 *   particle maxes, grade/grain/outline/shimmer/sparkle knobs, and an FX
 *   budget line showing live particle count and all visible layer alphas.
 *
 * All parallax scrolling, fog drift, fog tint, light-ray pulse, BitmapMask
 * water reflection, and biolume breathing is handled by BackgroundSystem.
 */
export class BackgroundSystemV2 extends BackgroundSystem {
  // Stored under distinct names to avoid TypeScript private-field collision
  // with the parent class's identically-named private properties.
  private v2Scene: Phaser.Scene
  private v2Env: EnvironmentConfig

  // ── v6.1.4 layers ────────────────────────────────────────────────────────
  private vignetteSprite: Phaser.GameObjects.Image | null = null
  private gradeSprite: Phaser.GameObjects.Image | null = null
  private grainSprite: Phaser.GameObjects.TileSprite | null = null
  /** Accumulated horizontal offset for grain TileSprite animation (px). */
  private grainScrollX = 0

  // ── v6.1.6 layers ────────────────────────────────────────────────────────
  /** Dark-to-transparent gradient covering the bottom 18% — grounds the swamp. */
  private bottomScrimSprite: Phaser.GameObjects.Image | null = null
  /** Horizontal violet-blue haze centred at waterlineY — blends swamp into ground. */
  private bankHazeSprite: Phaser.GameObjects.Image | null = null

  // ── v6.1.7 QA forensics ──────────────────────────────────────────────────
  /** Currently soloed layer index (0-based). null = no solo. */
  private v2SoloIndex: number | null = null
  /** Whether the sprite-bounds overlay is visible. */
  private v2ShowBounds = false
  /** Graphics object used to draw per-sprite bounding rectangles in QA mode. */
  private v2BoundsGraphics: Phaser.GameObjects.Graphics | null = null

  // ── v6.1.5 layers ────────────────────────────────────────────────────────
  private shimmerSprite: Phaser.GameObjects.TileSprite | null = null
  private shimmerMaskSprite: Phaser.GameObjects.Image | null = null
  /** Accumulated scroll offsets for shimmer TileSprite (px). */
  private shimmerScrollX = 0
  private shimmerScrollY = 0
  /** Shared elapsed time (seconds) for shimmer alpha pulse. */
  private v2Elapsed = 0
  /** Biolume sparkle particle emitters (one per patch). */
  private v2SparkleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = []
  /** Scratch point pre-allocated once per sparkle emitter, never recreated. */
  private v2ScratchPoints: Phaser.Geom.Point[] = []
  /** Mirrors parent's reducedMotion flag for V2 objects. */
  private v2ReducedMotion = false
  /** Mirrors parent's lowPower flag for V2 objects. */
  private v2LowPower = false

  constructor(scene: Phaser.Scene, env: EnvironmentConfig) {
    super(scene, env)
    this.v2Scene = scene
    this.v2Env = env
  }

  /** Human-readable label for the current environment (e.g. "Evil Forest V2"). */
  envLabel(): string {
    return this.v2Env.label
  }

  // ─── Lifecycle overrides ────────────────────────────────────────────────────

  override create(): void {
    super.create()
    this.v2CreateBankHaze()
    this.v2CreateBottomScrim()
    this.v2CreateVignette()
    this.v2CreateGrade()
    this.v2CreateGrain()
    this.v2CreateWaterShimmer()
    this.v2CreateBiolumeSparklees()
    // QA bounds graphics — lives above everything at depth 10
    this.v2BoundsGraphics = this.v2Scene.add.graphics().setDepth(10).setVisible(false)
  }

  override destroy(): void {
    // Destroy V2-owned objects before delegating to parent.
    const destroySprite = (s: { destroy: () => void } | null): null => {
      s?.destroy()
      return null
    }
    this.bottomScrimSprite = destroySprite(this.bottomScrimSprite)
    this.bankHazeSprite  = destroySprite(this.bankHazeSprite)
    this.v2BoundsGraphics?.destroy()
    this.v2BoundsGraphics = null
    this.vignetteSprite  = destroySprite(this.vignetteSprite)
    this.gradeSprite     = destroySprite(this.gradeSprite)
    this.grainSprite     = destroySprite(this.grainSprite)
    this.shimmerSprite   = destroySprite(this.shimmerSprite)
    this.shimmerMaskSprite = destroySprite(this.shimmerMaskSprite)
    for (const emitter of this.v2SparkleEmitters) {
      emitter.destroy()
    }
    this.v2SparkleEmitters = []
    this.v2ScratchPoints   = []
    super.destroy()
  }

  override update(dt: number): void {
    super.update(dt)

    if (this.v2ShowBounds) {
      this.v2UpdateBoundsGraphics()
    }

    if (!this.v2ReducedMotion) {
      this.v2Elapsed += dt

      // ── Grain scroll
      if (this.grainSprite && this.v2Env.grain) {
        this.grainScrollX += dt * (this.v2Env.grain.scrollSpeed ?? 55)
        this.grainSprite.setTilePosition(this.grainScrollX % 256, 0)
      }

      // ── Water shimmer scroll + alpha pulse
      if (this.shimmerSprite && this.v2Env.waterShimmer?.enabled && !this.v2LowPower) {
        const cfg = this.v2Env.waterShimmer
        this.shimmerScrollX += dt * cfg.scrollX
        this.shimmerScrollY += dt * cfg.scrollY
        this.shimmerSprite.setTilePosition(this.shimmerScrollX % 128, this.shimmerScrollY % 64)
        const pulse = Math.sin(this.v2Elapsed * cfg.pulseHz * Math.PI * 2) * 0.5 + 0.5
        this.shimmerSprite.setAlpha(cfg.alpha * (1 - cfg.pulseAmp + pulse * cfg.pulseAmp))
      }
    }
  }

  override setEnvironment(env: EnvironmentConfig): void {
    this.v2Env = env
    // super.setEnvironment() calls this.destroy() then this.create() via
    // polymorphism, so all V2 objects are cleaned up and recreated automatically.
    super.setEnvironment(env)
  }

  override setReducedMotion(reduced: boolean): void {
    this.v2ReducedMotion = reduced
    super.setReducedMotion(reduced)
    // Pause/resume sparkle emitters alongside reducedMotion
    for (const emitter of this.v2SparkleEmitters) {
      emitter.setVisible(!reduced)
    }
  }

  override setLowPowerMode(enabled: boolean): void {
    this.v2LowPower = enabled
    super.setLowPowerMode(enabled)
    this.applyV2LowPowerVisibility()
  }

  // ─── QA forensics overrides ─────────────────────────────────────────────────

  /**
   * QA: Toggle visibility of a numbered V2 slot (1–9 in the overlay).
   * Slots map to grouped overlays rather than individual parallax layers.
   */
  override toggleLayerByIndex(index: number): string {
    const names = this.getV2SlotNames()
    if (index < 0 || index >= names.length) return ''

    if (this.v2SoloIndex !== null) {
      this.v2SoloIndex = null
      this.applyV2SoloVisibility()
    }

    const visibility = this.getV2SlotVisibility()
    const nextVisible = !(visibility[index] ?? false)
    this.setV2SlotVisible(index, nextVisible)
    return names[index]
  }

  /**
   * QA: Solo the layer at `index`. If already soloed at that index, exit solo
   * and restore all layers to full visibility.
   *
   * In solo mode ALL sprites except the chosen layer are hidden, making it
   * trivial to identify which layer carries a rectangular artifact.
   */
  override toggleSoloLayer(index: number): void {
    if (index < 0 || index >= this.getV2SlotNames().length) return
    this.v2SoloIndex = this.v2SoloIndex === index ? null : index
    this.applyV2SoloVisibility()
  }

  /**
   * QA: Toggle the sprite-bounds overlay.
   * When on, a coloured rectangle is drawn around each visible overlay sprite
   * every frame.  If a rectangle aligns with an artifact, that sprite is the
   * culprit.
   */
  override toggleBounds(): void {
    this.v2ShowBounds = !this.v2ShowBounds
    if (!this.v2ShowBounds) {
      this.v2BoundsGraphics?.clear().setVisible(false)
    } else {
      this.v2BoundsGraphics?.setVisible(true)
    }
  }

  // ─── QA debug overlay ──────────────────────────────────────────────────────

  /**
   * Returns a structured block of debug lines shown in the env QA overlay
   * (enabled via VITE_ART_QA=true or the ?qa=1 query param).
   *
   * Sections:
   *   • Environment key + label + game dimensions
   *   • Parallax layer speeds
   *   • Fog alpha / speed / tint / drift
   *   • Biolume patch count + blend mode + sparkle config
   *   • Configured particle caps (enabled emitters only)
   *   • Grade / grain / outline / water shimmer knobs
   *   • FX budget: live particle count + all visible layer alphas
   *   • Loaded texture dimensions for every V2 asset
   */
  override getDebugLines(): string[] {
    const { width: W, height: H } = GAME_DIMENSIONS

    // ── parallax
    const layerLines = this.v2Env.layers.map(
      (l) => `  ${l.name.padEnd(12)} spd=${l.speed.toFixed(2)}`,
    )

    // ── fog
    const fogLines = this.v2Env.fogLayers.map((l: EnvironmentFogLayer) => {
      const tintStr =
        l.tint !== undefined
          ? ` tint=#${l.tint.toString(16).padStart(6, '0')}`
          : ''
      const driftStr = l.driftSpeed !== undefined ? ` drift=${l.driftSpeed.toFixed(3)}` : ''
      return `  ${l.name.padEnd(6)} α=${(l.alpha ?? 0).toFixed(2)} spd=${l.speed.toFixed(2)}${tintStr}${driftStr}`
    })

    // ── biolume
    const bio = this.v2Env.biolume
    const bioPatches = bio?.patches.length ?? 0
    const bioBlend = bio?.blendMode ?? 'n/a'
    const bioSparkleMax = bio?.sparkleMax ?? 14
    const bioSpawnRate = bio?.sparkleSpawnRate ?? 850
    const bioLiveCount = this.v2SparkleEmitters.reduce(
      (sum, e) => sum + e.getAliveParticleCount(),
      0,
    )
    const biolumeLines = [
      `  patches=${bioPatches} blend=${bioBlend}`,
      `  sparkleMax=${bioSparkleMax} spawnRate=${bioSpawnRate}ms alive=${bioLiveCount}`,
    ]

    // ── particles (configured maxes for enabled emitters)
    const particleLines = Object.entries(this.v2Env.particles)
      .filter(([, p]) => p?.enabled)
      .map(([k, p]) => `  ${k.padEnd(10)} max=${p?.maxParticles ?? 0}`)

    // ── grade / grain / outline
    const gradeStr = this.v2Env.grade
      ? `α=${this.v2Env.grade.alpha.toFixed(2)} depth=${this.v2Env.grade.depth.toFixed(2)}`
      : 'disabled'
    const grainStr = this.v2Env.grain
      ? `α=${this.v2Env.grain.alpha.toFixed(2)} depth=${this.v2Env.grain.depth.toFixed(2)} spd=${(this.v2Env.grain.scrollSpeed ?? 55).toFixed(0)}`
      : 'disabled'
    const outlineStr = this.v2Env.outline
      ? `α=${this.v2Env.outline.alpha.toFixed(2)} scale=${this.v2Env.outline.scale.toFixed(2)} tint=${this.v2Env.outline.tint !== undefined ? '#' + this.v2Env.outline.tint.toString(16).padStart(6, '0') : 'none'}`
      : 'disabled'

    // ── water shimmer
    const shimmerCfg = this.v2Env.waterShimmer
    const shimmerStr = shimmerCfg?.enabled
      ? `α=${shimmerCfg.alpha.toFixed(2)} spdX=${shimmerCfg.scrollX} spdY=${shimmerCfg.scrollY} pulseAmp=${shimmerCfg.pulseAmp.toFixed(2)} hz=${shimmerCfg.pulseHz.toFixed(2)}`
      : 'disabled'

    // ── FX budget (live alphas snapshot for cohesion QA)
    const fogAStr = this.v2Env.fogLayers.map((l) => (l.alpha ?? 0).toFixed(2)).join('/')
    const fxBudget = [
      `  sparkles_alive=${bioLiveCount}`,
      `  fog_α=${fogAStr}  rays_α=${(this.v2Env.lightRays?.alpha ?? 0).toFixed(2)}`,
      `  grade_α=${(this.v2Env.grade?.alpha ?? 0).toFixed(2)}  grain_α=${(this.v2Env.grain?.alpha ?? 0).toFixed(2)}`,
      `  shimmer_α=${(shimmerCfg?.alpha ?? 0).toFixed(2)}  outline_α=${(this.v2Env.outline?.alpha ?? 0).toFixed(2)}`,
      `  bottom_scrim_h=${BOTTOM_SCRIM_H}px  depth=${BOTTOM_SCRIM_DEPTH}`,
    ]

    // ── visible slots (QA isolation: keys 1–9 toggle, Shift+1–9 solo)
    const slotNames = this.getV2SlotNames()
    const slotVis = this.getV2SlotVisibility()
    const soloStr = this.v2SoloIndex !== null
      ? `SOLO=[${this.v2SoloIndex + 1}] ${slotNames[this.v2SoloIndex] ?? '?'}`
      : 'none'
    const visLines = slotNames.length > 0
      ? slotNames.map((name, i) => {
          const soloMark = this.v2SoloIndex === i ? ' ◀SOLO' : ''
          return `  [${i + 1}] ${slotVis[i] ? '●' : '○'} ${name}${soloMark}`
        })
      : ['  (none)']

    // ── RGBA samples (proves whether RGB+alpha sanitization has been applied)
    // v6.1.8: shows full (r,g,b,a) not just alpha — artifact condition is
    // alpha≈0 BUT RGB>0, not alpha>0 alone. ✗ means plate risk even if α=0.
    const buildSampleLine = (key: string, label: string, threshold: number): string => {
      if (!this.v2Scene.textures.exists(key)) return `  ${label}: (not loaded)`
      const tex = this.v2Scene.textures.get(key)
      const src = tex.getSourceImage() as { width?: number; height?: number }
      const maxX = Math.max(0, (src?.width ?? 1) - 1)
      const maxY = Math.max(0, (src?.height ?? 1) - 1)
      const midX = Math.floor(maxX / 2)
      const midY = Math.floor(maxY / 2)
      const points: Array<{ label: string; x: number; y: number }> = [
        { label: 'TL', x: 0,    y: 0 },
        { label: 'TM', x: midX, y: 0 },
        { label: 'TR', x: maxX, y: 0 },
        { label: 'ML', x: 0,    y: midY },
        { label: 'MR', x: maxX, y: midY },
        { label: 'BL', x: 0,    y: maxY },
        { label: 'BM', x: midX, y: maxY },
        { label: 'BR', x: maxX, y: maxY },
      ]

      const samples = points.map(({ label: pointLabel, x, y }) => {
        const c = this.v2Scene.textures.getPixel(x, y, key)
        if (!c) {
          return { label: pointLabel, value: '(?)', dirty: false }
        }
        const dirty = c.alpha <= threshold && (c.red > 0 || c.green > 0 || c.blue > 0)
        return {
          label: pointLabel,
          value: `(${c.red},${c.green},${c.blue},${c.alpha})`,
          dirty,
        }
      })

      const anyDirty = samples.some((s) => s.dirty)
      const flag = anyDirty ? '✗' : '✓'
      return `  ${flag} ${label.padEnd(12)} ${samples.map((s) => `${s.label}=${s.value}`).join(' ')}`
    }

    const rgbaSampleLines = [
      ...V2_SANITIZE_MANIFEST.map(({ key, label, threshold }) =>
        buildSampleLine(key, label, threshold),
      ),
    ]
    if (this.v2Scene.textures.exists(SHIMMER_TEX_KEY)) {
      rgbaSampleLines.push(buildSampleLine(SHIMMER_TEX_KEY, 'water_shimmer', 8))
    }

    // ── textures
    const texLines = this.v2Env.assets.map((asset) => {
      const tex = this.v2Scene.textures.get(asset.key)
      if (!tex || tex.key === '__MISSING') return `  ${asset.key}: (missing)`
      const src = tex.getSourceImage() as { width?: number; height?: number }
      return `  ${asset.key}: ${src?.width ?? '?'}×${src?.height ?? '?'}`
    })

    return [
      `env: ${this.v2Env.key} — ${this.v2Env.label} (${W}×${H})`,
      '',
      'QA FORENSICS (Shift+1–9 solo, B bounds):',
      `  solo: ${soloStr}   bounds: ${this.v2ShowBounds ? 'ON' : 'OFF'}`,
      '',
      'RGBA SAMPLES (✓=clean, ✗=artifact risk):',
      ...rgbaSampleLines,
      '',
      'PARALLAX:',
      ...layerLines,
      '',
      'FOG:',
      ...fogLines,
      '',
      'QA SLOTS (1–9 toggle):',
      ...visLines,
      '',
      'BIOLUME:',
      ...biolumeLines,
      '',
      'PARTICLES (max, enabled):',
      ...particleLines,
      '',
      'GRADE/GRAIN/OUTLINE:',
      `  grade:   ${gradeStr}`,
      `  grain:   ${grainStr}`,
      `  outline: ${outlineStr}`,
      '',
      'WATER_SHIMMER:',
      `  ${shimmerStr}`,
      '',
      'FX BUDGET:',
      ...fxBudget,
      '',
      'TEXTURES:',
      ...texLines,
    ]
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  // ─── QA forensics private helpers ───────────────────────────────────────────

  private getV2SlotNames(): string[] {
    return [
      'Parallax (BG+FG)',
      'Fog A',
      'Fog B',
      'Light Rays (SCREEN)',
      'Biolume (ADD)',
      'Reflection',
      'Shimmer (SCREEN)',
      'Grade',
      'Grain',
    ]
  }

  private getV2LayerCounts(): { bg: number; fog: number; fg: number } {
    return {
      bg: this.v2Env.layers.length,
      fog: this.v2Env.fogLayers.length,
      fg: this.v2Env.foregroundLayers?.length ?? 0,
    }
  }

  private getV2SlotVisibility(): boolean[] {
    const { bg, fog, fg } = this.getV2LayerCounts()
    const layerVis = this.getLayerVisibility()

    let parallaxVisible = false
    for (let i = 0; i < bg; i++) {
      if (layerVis[i]) {
        parallaxVisible = true
        break
      }
    }
    if (!parallaxVisible) {
      for (let i = 0; i < fg; i++) {
        if (layerVis[bg + fog + i]) {
          parallaxVisible = true
          break
        }
      }
    }

    const fogAVisible = fog >= 1 ? layerVis[bg] : false
    const fogBVisible = fog >= 2 ? layerVis[bg + 1] : false

    const lightRaysVisible = this.getLightRaysSprite()?.visible ?? false
    const biolumeVisible =
      this.getBiolumeSprites().some((s) => s.visible) ||
      this.v2SparkleEmitters.some((e) => e.visible)
    const reflectionVisible = this.getReflectionDebugInfo()?.container.visible ?? false
    const shimmerVisible = this.shimmerSprite?.visible ?? false
    const gradeVisible = this.gradeSprite?.visible ?? false
    const grainVisible = this.grainSprite?.visible ?? false

    return [
      parallaxVisible,
      fogAVisible,
      fogBVisible,
      lightRaysVisible,
      biolumeVisible,
      reflectionVisible,
      shimmerVisible,
      gradeVisible,
      grainVisible,
    ]
  }

  private setV2SlotVisible(index: number, visible: boolean): void {
    switch (index) {
      case 0:
        this.setParallaxVisible(visible)
        break
      case 1:
        this.setFogLayerVisible(0, visible)
        break
      case 2:
        this.setFogLayerVisible(1, visible)
        break
      case 3:
        this.setLightRaysVisible(visible)
        break
      case 4:
        this.setBiolumeVisible(visible)
        for (const e of this.v2SparkleEmitters) e.setVisible(visible)
        break
      case 5:
        this.setReflectionVisible(visible)
        break
      case 6:
        this.shimmerSprite?.setVisible(visible)
        break
      case 7:
        this.gradeSprite?.setVisible(visible)
        break
      case 8:
        this.grainSprite?.setVisible(visible)
        break
      default:
        break
    }
  }

  private setParallaxVisible(visible: boolean): void {
    const { bg, fog, fg } = this.getV2LayerCounts()
    for (let i = 0; i < bg; i++) {
      this.setLayerVisible(i, visible)
    }
    for (let i = 0; i < fg; i++) {
      this.setLayerVisible(bg + fog + i, visible)
    }
  }

  private setFogLayerVisible(fogIndex: number, visible: boolean): void {
    const { bg, fog } = this.getV2LayerCounts()
    if (fogIndex < 0 || fogIndex >= fog) return
    this.setLayerVisible(bg + fogIndex, visible)
  }

  /**
   * Apply solo/restore visibility across all V2 and parent sprites.
   * In solo mode every sprite except the chosen layer is hidden so the viewer
   * can confirm whether that layer carries a rectangular artifact.
   */
  private applyV2SoloVisibility(): void {
    const solo = this.v2SoloIndex
    const slotCount = this.getV2SlotNames().length

    if (solo === null) {
      for (let i = 0; i < slotCount; i++) {
        this.setV2SlotVisible(i, true)
      }
      this.vignetteSprite?.setVisible(true)
      this.bottomScrimSprite?.setVisible(true)
      this.bankHazeSprite?.setVisible(true)
      return
    }

    for (let i = 0; i < slotCount; i++) {
      this.setV2SlotVisible(i, i === solo)
    }
    this.vignetteSprite?.setVisible(false)
    this.bottomScrimSprite?.setVisible(false)
    this.bankHazeSprite?.setVisible(false)
  }

  /**
   * Redraws sprite-bounds rectangles each frame when `v2ShowBounds` is true.
   * Each overlay sprite category gets a distinct colour so any rectangle that
   * aligns with a visible artifact immediately identifies the culprit.
   *
   *  Red       — parallax (bg + fg) TileSprites
   *  Blue      — fog TileSprites (A/B)
   *  Orange    — light-rays Image
   *  Yellow    — biolume patch Images
   *  Teal      — reflection container/layers
   *  White     — reflection mask helper image
   *  Cyan      — water shimmer TileSprite
   *  Green     — grade Image
   *  Magenta   — grain TileSprite
   *  Gray      — bottom scrim + bank haze
   */
  private v2UpdateBoundsGraphics(): void {
    if (!this.v2BoundsGraphics) return
    const g = this.v2BoundsGraphics
    g.clear()

    const drawBounds = (
      obj: Phaser.GameObjects.GameObject | null,
      color: number,
      alpha = 0.9,
    ): void => {
      if (!obj) return
      const bounded = obj as Phaser.GameObjects.GameObject & {
        getBounds: () => Phaser.Geom.Rectangle
      }
      if (!bounded.getBounds) return
      const bounds = bounded.getBounds()
      g.lineStyle(1.5, color, alpha)
      g.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }

    // Parallax layers (bg + fg)
    for (const sprite of this.getBackgroundLayerSprites()) {
      if (sprite.visible) drawBounds(sprite, 0xff4444, 0.9)
    }
    for (const sprite of this.getForegroundLayerSprites()) {
      if (sprite.visible) drawBounds(sprite, 0xff6666, 0.9)
    }

    // Fog layers (A/B)
    const fogSprites = this.getFogLayerSprites()
    fogSprites.forEach((sprite, i) => {
      if (!sprite.visible) return
      const color = i === 0 ? 0x66bfff : 0x4a8cff
      drawBounds(sprite, color, 0.9)
    })

    // Light-rays Image
    const lightRays = this.getLightRaysSprite()
    if (lightRays?.visible) drawBounds(lightRays, 0xff8800, 0.9)

    // Biolume patch Images
    for (const sprite of this.getBiolumeSprites()) {
      if (sprite.visible) drawBounds(sprite, 0xffff00, 0.9)
    }

    // Water reflection container/layers + mask helper
    const reflection = this.getReflectionDebugInfo()
    if (reflection) {
      if (reflection.container.visible) {
        drawBounds(reflection.container, 0x22c0ff, 0.9)
        reflection.layers.forEach((layer) => {
          if (layer.visible) drawBounds(layer, 0x22c0ff, 0.9)
        })
      }
      // Mask helper is invisible by design; still draw its bounds for QA.
      drawBounds(reflection.maskSprite, 0xffffff, 0.7)
    }

    // Water shimmer TileSprite
    if (this.shimmerSprite?.visible) drawBounds(this.shimmerSprite, 0x00ffff, 0.9)

    // Grade Image (full-canvas)
    if (this.gradeSprite?.visible) drawBounds(this.gradeSprite, 0x00ff00, 0.9)

    // Grain TileSprite (full-canvas)
    if (this.grainSprite?.visible) drawBounds(this.grainSprite, 0xff00ff, 0.9)

    // Bottom scrim + bank haze
    if (this.bottomScrimSprite?.visible) drawBounds(this.bottomScrimSprite, 0xaaaaaa, 0.8)
    if (this.bankHazeSprite?.visible) drawBounds(this.bankHazeSprite, 0xaaaaaa, 0.8)
  }

  /** Apply low-power visibility to V2-exclusive objects (shimmer, sparkles). */
  private applyV2LowPowerVisibility(): void {
    // Shimmer is analogous to reflection — disable in low power mode.
    if (this.shimmerSprite) {
      this.shimmerSprite.setVisible(!this.v2LowPower)
    }
    // Sparkles are analogous to biolume — disable when biolume is off.
    const hideSparkles =
      this.v2LowPower && (this.v2Env.lowPower?.disableBiolume ?? false)
    for (const emitter of this.v2SparkleEmitters) {
      emitter.setVisible(!hideSparkles)
    }
  }

  /**
   * Creates the full-screen grade overlay.
   *
   * The canvas texture is generated once (cool blue-purple base tint with an
   * additive radial edge-darkening pass) and reused across env switches.
   * The sprite alpha (from `env.grade.alpha`) controls the blend strength.
   *
   * Depth: `env.grade.depth` (default 3.50) — above all gameplay, below HUD.
   */
  private v2CreateGrade(): void {
    if (!this.v2Env.grade) return
    const { width, height } = GAME_DIMENSIONS

    if (!this.v2Scene.textures.exists(GRADE_TEX_KEY)) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Layer 1: Cool blue-purple tint — desaturates warm tones, adds cinematic cool cast.
        ctx.fillStyle = 'rgba(18, 28, 72, 0.70)'
        ctx.fillRect(0, 0, width, height)

        // Layer 2: Radial edge-darkening — adds contrast by dimming corners while
        // keeping the center corridor bright and readable.
        const cx = width / 2
        const cy = height * 0.46  // slightly above center to protect the play lane
        const r = Math.sqrt(cx * cx + (cy * 1.1) * (cy * 1.1)) * 1.05
        const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r)
        edgeGrad.addColorStop(0,    'rgba(0,0,0,0)')     // transparent at play center
        edgeGrad.addColorStop(0.65, 'rgba(0,0,0,0)')     // hold clear through play corridor
        edgeGrad.addColorStop(1,    'rgba(0,0,0,0.50)')  // darken edges
        ctx.fillStyle = edgeGrad
        ctx.fillRect(0, 0, width, height)
      }
      this.v2Scene.textures.addCanvas(GRADE_TEX_KEY, canvas)
    }

    this.gradeSprite = this.v2Scene.add
      .image(0, 0, GRADE_TEX_KEY)
      .setOrigin(0, 0)
      .setAlpha(this.v2Env.grade.alpha)
      .setDepth(this.v2Env.grade.depth)
  }

  /**
   * Creates a tileable 256×256 film-grain noise TileSprite.
   *
   * The noise canvas is generated with a uniform random pass so it tiles
   * seamlessly (all edges wrap modulo 256).  The TileSprite covers the full
   * game canvas; `update()` advances `grainScrollX` each frame for a slow
   * horizontal drift that avoids static-pattern perception.
   *
   * Depth: `env.grain.depth` (default 3.51) — directly above grade overlay.
   */
  private v2CreateGrain(): void {
    if (!this.v2Env.grain) return
    const { width, height } = GAME_DIMENSIONS
    const TILE = 256

    if (!this.v2Scene.textures.exists(GRAIN_TEX_KEY)) {
      const canvas = document.createElement('canvas')
      canvas.width = TILE
      canvas.height = TILE
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imgData = ctx.createImageData(TILE, TILE)
        const data = imgData.data
        for (let i = 0; i < TILE * TILE; i++) {
          // Simple pseudo-random luminance noise.
          const v = Math.floor(Math.random() * 256)
          const idx = i * 4
          data[idx]     = v
          data[idx + 1] = v
          data[idx + 2] = v
          data[idx + 3] = 255
        }
        ctx.putImageData(imgData, 0, 0)
      }
      this.v2Scene.textures.addCanvas(GRAIN_TEX_KEY, canvas)
    }

    this.grainScrollX = 0
    this.grainSprite = this.v2Scene.add
      .tileSprite(0, 0, width, height, GRAIN_TEX_KEY)
      .setOrigin(0, 0)
      .setAlpha(this.v2Env.grain.alpha)
      .setDepth(this.v2Env.grain.depth)
  }

  /**
   * Creates the water shimmer overlay — a tileable 128×64 specular-streak
   * TileSprite masked to the water/swamp region via the existing
   * water_reflection_mask BitmapMask.
   *
   * Visual: diagonally-streaked light glints that scroll slowly across the
   * swamp channels, giving a cheap but convincing wetness/reflectivity illusion.
   * SCREEN blend mode ensures it only brightens existing pixels, so no
   * "shimmer" is visible on already-dark water banks.
   *
   * Depth: `env.waterShimmer.depth` (default 0.70) — above swamp_near (0.66)
   * and water reflection (0.58), below foreground branches (0.84).
   */
  private v2CreateWaterShimmer(): void {
    if (!this.v2Env.waterShimmer?.enabled) return
    const cfg = this.v2Env.waterShimmer
    const { width, height } = GAME_DIMENSIONS

    // ── Build the specular-streak tile texture (once per session)
    if (!this.v2Scene.textures.exists(SHIMMER_TEX_KEY)) {
      const TW = 128
      const TH = 64
      const canvas = document.createElement('canvas')
      canvas.width = TW
      canvas.height = TH
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, TW, TH)
        // Elongated diagonal specular streaks — bright centre, transparent ends.
        // Placed to tile seamlessly across the water surface.
        const streaks: Array<{ x: number; y: number; len: number; angle: number; w: number }> = [
          { x:  8, y: 14, len: 62, angle:  11, w: 1.4 },
          { x: 44, y: 36, len: 50, angle:  -9, w: 1.2 },
          { x: 72, y: 18, len: 46, angle:  14, w: 1.6 },
          { x: 90, y: 50, len: 34, angle:   8, w: 1.0 },
          { x: 22, y: 54, len: 38, angle: -13, w: 1.2 },
          { x:105, y: 28, len: 28, angle:  10, w: 0.9 },
        ]
        for (const s of streaks) {
          const rad = (s.angle * Math.PI) / 180
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)
          const x2 = s.x + cos * s.len
          const y2 = s.y + sin * s.len
          const grad = ctx.createLinearGradient(s.x, s.y, x2, y2)
          grad.addColorStop(0,    'rgba(200,225,255,0)')
          grad.addColorStop(0.28, 'rgba(210,232,255,0.80)')
          grad.addColorStop(0.50, 'rgba(230,242,255,1.00)')
          grad.addColorStop(0.72, 'rgba(210,232,255,0.80)')
          grad.addColorStop(1,    'rgba(200,225,255,0)')
          ctx.strokeStyle = grad
          ctx.lineWidth = s.w
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }
      this.v2Scene.textures.addCanvas(SHIMMER_TEX_KEY, canvas)
    }

    // ── Position the TileSprite over the water region
    // Extend 20 px above waterlineY so the mask gradient looks natural.
    const waterlineY = this.v2Env.reflection?.waterlineY ?? 380
    const shimmerY   = Math.max(0, waterlineY - 20)
    const shimmerH   = height - shimmerY

    this.shimmerScrollX = 0
    this.shimmerScrollY = 0
    this.shimmerSprite = this.v2Scene.add
      .tileSprite(0, shimmerY, width, shimmerH, SHIMMER_TEX_KEY)
      .setOrigin(0, 0)
      .setAlpha(cfg.alpha)
      .setDepth(cfg.depth)
      .setBlendMode(Phaser.BlendModes.SCREEN)

    // ── Apply water-channel BitmapMask from the existing reflection mask asset.
    // A separate invisible Image is needed as the mask source object (Phaser 3 API).
    if (this.v2Env.reflection?.maskKey) {
      const maskImg = this.v2Scene.add
        .image(0, 0, this.v2Env.reflection.maskKey)
        .setOrigin(0, 0)
        .setVisible(false)
      maskImg.setDisplaySize(width, height)
      const bitmapMask = new Phaser.Display.Masks.BitmapMask(this.v2Scene, maskImg)
      this.shimmerSprite.setMask(bitmapMask)
      this.shimmerMaskSprite = maskImg
    }
  }

  /**
   * Creates localized micro-sparkle particle emitters at each biolume patch.
   *
   * Each emitter spawns tiny ADD-blend glowing dots that drift slowly upward
   * within a ~22 px radius of the patch centre — mimicking bubbles or
   * bioluminescent particles rising from a glowing pool.
   *
   * Budget: `env.biolume.sparkleMax` is shared across all emitters; each
   * emitter gets `floor(sparkleMax / patchCount)` max particles.  Default
   * sparkleMax=14 / 4 patches = 3 per emitter ≤ 18 total (spec-safe).
   *
   * No per-frame allocations: emit zones, scratch points and emitter configs
   * are all pre-allocated here in `create()`.
   */
  private v2CreateBiolumeSparklees(): void {
    if (!this.v2Env.biolume) return
    const bioCfg = this.v2Env.biolume
    const sparkleMax  = bioCfg.sparkleMax  ?? 14
    const spawnRate   = bioCfg.sparkleSpawnRate ?? 850
    const patchCount  = bioCfg.patches.length
    if (patchCount === 0 || sparkleMax <= 0) return

    const maxPerPatch = Math.max(1, Math.floor(sparkleMax / patchCount))
    const emitterDepth = bioCfg.depth + 0.01  // just above biolume glow patches

    // ── Sparkle dot texture (16×16 radial gradient, created once)
    if (!this.v2Scene.textures.exists(SPARKLE_DOT_KEY)) {
      const DOT = 16
      const canvas = document.createElement('canvas')
      canvas.width = DOT
      canvas.height = DOT
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const grad = ctx.createRadialGradient(DOT / 2, DOT / 2, 0, DOT / 2, DOT / 2, DOT / 2)
        grad.addColorStop(0,    'rgba(190,218,255,1.00)')
        grad.addColorStop(0.40, 'rgba(170,205,255,0.60)')
        grad.addColorStop(1,    'rgba(140,190,255,0.00)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, DOT, DOT)
      }
      this.v2Scene.textures.addCanvas(SPARKLE_DOT_KEY, canvas)
    }

    // ── Create one emitter per biolume patch.
    // Pre-allocate a Circle geom and a scratch Point per emitter (no GC pressure).
    for (let i = 0; i < patchCount; i++) {
      const patch = bioCfg.patches[i]

      // Circle emission zone (radius 22 px around the patch centre).
      // Pre-allocate the scratch point used inside the closure — it lives on
      // the BackgroundSystemV2 instance, not the stack, so there's no per-frame
      // allocation in the hot path.
      const circle = new Phaser.Geom.Circle(0, 0, 22)
      const scratchPt = new Phaser.Geom.Point()
      this.v2ScratchPoints.push(scratchPt)

      const emitZone = new Phaser.GameObjects.Particles.Zones.RandomZone({
        getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
          circle.getRandomPoint(scratchPt)
          point.x = scratchPt.x
          point.y = scratchPt.y
        },
      })

      const emitter = this.v2Scene.add.particles(patch.x, patch.y, SPARKLE_DOT_KEY, {
        maxParticles: maxPerPatch,
        quantity:     1,
        frequency:    spawnRate,
        lifespan:     { min: 900, max: 1800 },
        // Particles drift slowly upward with a small random horizontal spread.
        speedX: { min: -4,  max:  4  },
        speedY: { min: -12, max: -4  },  // negative Y = upward
        scale:  { start: 0.65, end: 0.08 },
        alpha:  { start: 0.55, end: 0.00 },
        tint:   0xa8ccff,
        blendMode: Phaser.BlendModes.ADD,
        emitZone,
      })
      emitter.setDepth(emitterDepth)
      this.v2SparkleEmitters.push(emitter)
    }
  }

  /**
   * Creates a dark-to-transparent bottom fog scrim that grounds the swamp
   * environment and eliminates any visible seam between the background layers
   * and the ground sprite.
   *
   * The texture is a vertical linear gradient:
   *   transparent at the top → dark swamp-teal-black at the bottom edge.
   *
   * The sprite is positioned at the very bottom of the game canvas, covering
   * the lower BOTTOM_SCRIM_H (115) pixels at depth BOTTOM_SCRIM_DEPTH (0.91):
   * above all background layers (max 0.84), below the background vignette (0.92),
   * and well below gameplay elements (pipes 1.0, bird 2.0, ground 3.0).
   *
   * Texture created once per session via key guard; reused on env switches.
   */
  /**
   * Creates a horizontal violet-blue haze band centred at the waterline.
   *
   * This blends `bg_swamp_near` into the ground sprite by softening the
   * hard visual edge where the water channels meet the playfield floor.
   *
   * Gradient: transparent at both top and bottom edges — opaque in the middle
   * of the BANK_HAZE_H strip — so it reads as atmospheric mist, not a band.
   *
   * Depth BANK_HAZE_DEPTH (0.685): above swamp_near (0.66), below shimmer (0.70).
   */
  private v2CreateBankHaze(): void {
    const { width } = GAME_DIMENSIONS
    const waterlineY = this.v2Env.reflection?.waterlineY ?? 380

    if (!this.v2Scene.textures.exists(BANK_HAZE_TEX_KEY)) {
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = BANK_HAZE_H
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, BANK_HAZE_H)
        grad.addColorStop(0,    'rgba(14, 20, 48, 0.00)')   // transparent at top edge
        grad.addColorStop(0.35, 'rgba(14, 20, 48, 0.20)')   // faint violet-blue fog peak
        grad.addColorStop(0.65, 'rgba(10, 16, 40, 0.14)')   // softer midsection
        grad.addColorStop(1,    'rgba(6,  10, 28, 0.00)')   // transparent at bottom edge
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, BANK_HAZE_H)
      }
      this.v2Scene.textures.addCanvas(BANK_HAZE_TEX_KEY, canvas)
    }

    this.bankHazeSprite = this.v2Scene.add
      .image(0, waterlineY - Math.round(BANK_HAZE_H / 2), BANK_HAZE_TEX_KEY)
      .setOrigin(0, 0)
      .setDepth(BANK_HAZE_DEPTH)
  }

  private v2CreateBottomScrim(): void {
    const { width, height } = GAME_DIMENSIONS

    if (!this.v2Scene.textures.exists(BOTTOM_SCRIM_TEX_KEY)) {
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = BOTTOM_SCRIM_H
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Foggy waterline gradient — NOT a flat dark band.
        // Palette: cool violet-blue fog that deepens toward the ground edge.
        //   top:    transparent (blends with bg layers above)
        //   middle: faint violet-blue atmospheric haze
        //   lower:  deeper cool-purple shadow anchors the scene
        //   bottom: near-opaque cool shadow at the very bottom edge
        const grad = ctx.createLinearGradient(0, 0, 0, BOTTOM_SCRIM_H)
        grad.addColorStop(0,    'rgba(10, 15, 36, 0.00)')   // transparent at top
        grad.addColorStop(0.38, 'rgba(10, 15, 36, 0.06)')   // faint violet-blue haze
        grad.addColorStop(0.68, 'rgba(8,  12, 28, 0.18)')   // cool mid-shadow
        grad.addColorStop(1,    'rgba(5,  8,  20, 0.36)')   // deeper bottom anchor
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, BOTTOM_SCRIM_H)
      }
      this.v2Scene.textures.addCanvas(BOTTOM_SCRIM_TEX_KEY, canvas)
    }

    this.bottomScrimSprite = this.v2Scene.add
      .image(0, height - BOTTOM_SCRIM_H, BOTTOM_SCRIM_TEX_KEY)
      .setOrigin(0, 0)
      .setDepth(BOTTOM_SCRIM_DEPTH)
  }

  /**
   * Creates a soft radial vignette using a programmatic HTML canvas.
   * The texture is generated once (key check prevents duplicate creation on
   * environment switch) and destroyed only when the Phaser scene is torn down.
   *
   * Visual: transparent at center → dark purple-black at corners.
   * The 0.42 inner stop holds full transparency through most of the playfield.
   */
  private v2CreateVignette(): void {
    const { width, height } = GAME_DIMENSIONS

    if (!this.v2Scene.textures.exists(VIGNETTE_TEX_KEY)) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const cx = width / 2
        const cy = height / 2
        // Outer radius = just past the farthest corner
        const r = Math.sqrt(cx * cx + cy * cy) * 1.06
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        gradient.addColorStop(0,    'rgba(2,1,8,0)')    // transparent at center
        gradient.addColorStop(0.42, 'rgba(2,1,8,0)')    // hold through midfield
        gradient.addColorStop(1,    'rgba(2,1,8,0.62)') // dark purple-black at edges
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      }
      this.v2Scene.textures.addCanvas(VIGNETTE_TEX_KEY, canvas)
    }

    this.vignetteSprite = this.v2Scene.add
      .image(0, 0, VIGNETTE_TEX_KEY)
      .setOrigin(0, 0)
      .setDepth(VIGNETTE_DEPTH)
  }
}
