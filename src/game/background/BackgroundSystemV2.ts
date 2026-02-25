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
  }

  override destroy(): void {
    // Destroy V2-owned objects before delegating to parent.
    if (this.vignetteSprite) {
      this.vignetteSprite.destroy()
      this.vignetteSprite = null
    }
    super.destroy()
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
      'TEXTURES:',
      ...texLines,
    ]
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

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
