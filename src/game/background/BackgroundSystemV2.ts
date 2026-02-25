import Phaser from 'phaser'
import { BackgroundSystem } from '../systems/BackgroundSystem'
import type { EnvironmentConfig } from '../theme/env/types'

/**
 * BackgroundSystemV2 — extends BackgroundSystem with V2-specific capabilities:
 *
 * • Texture size reporting in getDebugLines() for QA overlay.
 * • envLabel() helper for HUD display.
 *
 * All parallax, fog, light rays, biolume, water reflection, and particle
 * coordination logic is inherited from BackgroundSystem; this class only
 * adds observability on top of it.
 */
export class BackgroundSystemV2 extends BackgroundSystem {
  // Stored under distinct names to avoid TypeScript private-field collision
  // with the parent class's identically-named private properties.
  private v2Scene: Phaser.Scene
  private v2Env: EnvironmentConfig

  constructor(scene: Phaser.Scene, env: EnvironmentConfig) {
    super(scene, env)
    this.v2Scene = scene
    this.v2Env = env
  }

  /** Human-readable label for the current environment. */
  envLabel(): string {
    return this.v2Env.label
  }

  /**
   * Overrides getDebugLines to append loaded texture dimensions for each
   * V2 asset. Falls back gracefully if a texture hasn't loaded yet.
   */
  override getDebugLines(): string[] {
    const base = super.getDebugLines()
    const sizeLines: string[] = []
    for (const asset of this.v2Env.assets) {
      const tex = this.v2Scene.textures.get(asset.key)
      if (!tex || tex.key === '__MISSING') {
        sizeLines.push(`  ${asset.key}: (missing)`)
        continue
      }
      const src = tex.getSourceImage() as { width?: number; height?: number }
      const w = src?.width ?? '?'
      const h = src?.height ?? '?'
      sizeLines.push(`  ${asset.key}: ${w}×${h}`)
    }
    if (sizeLines.length > 0) {
      return [...base, 'TEXTURES:', ...sizeLines]
    }
    return base
  }

  override setEnvironment(env: EnvironmentConfig): void {
    this.v2Env = env
    super.setEnvironment(env)
  }
}
