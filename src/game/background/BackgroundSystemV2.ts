import Phaser from 'phaser'
import { GAME_DIMENSIONS } from '../config'
import { BackgroundSystem } from '../systems/BackgroundSystem'
import type { EnvironmentConfig, EnvironmentFogLayer } from '../theme/env/types'

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
 * Depth of the background vignette — above all background layers (max 0.84)
 * but below gameplay elements (pipes/obstacles at 1.0, bird at 2.0).
 */
const VIGNETTE_DEPTH = 0.92

/**
 * BackgroundSystemV2 — extends BackgroundSystem with V2-specific features:
 *
 * COMPOSITION
 * • Adds a soft radial vignette (programmatic canvas texture, created once)
 *   placed above all background layers at depth 0.92 to frame the scene
 *   cinematically without obscuring the play corridor.
 *
 * OBSERVABILITY
 * • `getDebugLines()` returns a rich QA overlay covering envKey, all layer
 *   parallax speeds, fog alpha/speed/tint/drift, biolume info, configured
 *   particle maxes, and per-asset texture dimensions.
 *
 * All parallax scrolling, fog drift, fog tint, light-ray pulse, BitmapMask
 * water reflection, and biolume breathing is handled by BackgroundSystem.
 */
export class BackgroundSystemV2 extends BackgroundSystem {
  // Stored under distinct names to avoid TypeScript private-field collision
  // with the parent class's identically-named private properties.
  private v2Scene: Phaser.Scene
  private v2Env: EnvironmentConfig
  private vignetteSprite: Phaser.GameObjects.Image | null = null
  private gradeSprite: Phaser.GameObjects.Image | null = null
  private grainSprite: Phaser.GameObjects.TileSprite | null = null
  /** Accumulated horizontal offset for grain TileSprite animation (px). */
  private grainScrollX = 0

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
    this.v2CreateVignette()
    this.v2CreateGrade()
    this.v2CreateGrain()
  }

  override destroy(): void {
    // Destroy V2-owned objects before delegating to parent.
    if (this.vignetteSprite) {
      this.vignetteSprite.destroy()
      this.vignetteSprite = null
    }
    if (this.gradeSprite) {
      this.gradeSprite.destroy()
      this.gradeSprite = null
    }
    if (this.grainSprite) {
      this.grainSprite.destroy()
      this.grainSprite = null
    }
    super.destroy()
  }

  override update(dt: number): void {
    super.update(dt)
    // Animate grain by slowly scrolling its tile position each frame.
    if (this.grainSprite && this.v2Env.grain) {
      this.grainScrollX += dt * (this.v2Env.grain.scrollSpeed ?? 55)
      this.grainSprite.setTilePosition(this.grainScrollX % 256, 0)
    }
  }

  override setEnvironment(env: EnvironmentConfig): void {
    this.v2Env = env
    // super.setEnvironment() calls this.destroy() then this.create() via
    // polymorphism, so the vignette is cleaned up and recreated automatically.
    super.setEnvironment(env)
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
   *   • Biolume patch count + blend mode
   *   • Configured particle caps (enabled emitters only)
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
    const bioPatches = this.v2Env.biolume?.patches.length ?? 0
    const bioBlend = this.v2Env.biolume?.blendMode ?? 'n/a'
    const biolumeLines = [`  patches=${bioPatches} blend=${bioBlend}`]

    // ── particles (configured maxes for enabled emitters)
    const particleLines = Object.entries(this.v2Env.particles)
      .filter(([, p]) => p?.enabled)
      .map(([k, p]) => `  ${k.padEnd(10)} max=${p?.maxParticles ?? 0}`)

    // ── textures
    const texLines = this.v2Env.assets.map((asset) => {
      const tex = this.v2Scene.textures.get(asset.key)
      if (!tex || tex.key === '__MISSING') return `  ${asset.key}: (missing)`
      const src = tex.getSourceImage() as { width?: number; height?: number }
      return `  ${asset.key}: ${src?.width ?? '?'}×${src?.height ?? '?'}`
    })

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

    return [
      `env: ${this.v2Env.key} — ${this.v2Env.label} (${W}×${H})`,
      '',
      'PARALLAX:',
      ...layerLines,
      '',
      'FOG:',
      ...fogLines,
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
      'TEXTURES:',
      ...texLines,
    ]
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

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
   * The noise canvas is generated with a seeded-style uniform random pass so
   * it tiles seamlessly (all edges wrap modulo 256).  The TileSprite covers
   * the full game canvas; `update()` advances `grainScrollX` each frame for
   * a slow horizontal drift that avoids static-pattern perception.
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
