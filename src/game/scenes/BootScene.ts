import Phaser from 'phaser'
import { getActiveTheme } from '../theme'
import { getEnvironmentAssets } from '../theme/env'

/**
 * ADD / SCREEN blend textures that need alpha-floor sanitization.
 *
 * Even with Playwright's omitBackground:true, SVG ambient gradients can leave
 * alpha 1–5 at sprite edges.  ADD and SCREEN blend modes amplify these faint
 * floors into visible rectangular plates (the "purple-square" artifact).
 *
 * sanitizeAlphaTexture() reads pixel data once at load time, clamps any alpha
 * ≤ threshold to 0, and replaces the Phaser texture in-place (same key).
 * This eliminates rectangles robustly, independent of how assets were exported.
 *
 * Thresholds are conservative: glow cores have alpha >> 50, so only the
 * invisible fringe is removed.
 */
const V2_SANITIZE: Array<{ key: string; threshold: number }> = [
  { key: 'v2-fog-soft',   threshold: 12 },   // fog tile — remove edge floors
  { key: 'v2-light-rays', threshold: 10 },   // SCREEN blend — kill outer plate
  { key: 'v2-biolume',    threshold: 16 },   // ADD blend   — strongest sanitizer
  { key: 'v2-water-mask', threshold:  6 },   // BitmapMask  — should be binary
]

/**
 * Preloads visual assets before gameplay starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    const theme = getActiveTheme()
    const supportsWebp = this.supportsWebp()
    if (theme.assets.atlas) {
      const atlasImage = supportsWebp
        ? theme.assets.atlas.imageWebp ?? theme.assets.atlas.imagePng
        : theme.assets.atlas.imagePng
      this.load.atlas(theme.assets.atlas.key, atlasImage, theme.assets.atlas.data)
    }
    Object.entries(theme.assets.images).forEach(([key, path]) => {
      this.load.image(key, path)
    })
    if (theme.id === 'evil-forest') {
      getEnvironmentAssets().forEach((asset) => {
        const path = supportsWebp ? asset.pathWebp ?? asset.path : asset.path
        this.load.image(asset.key, path)
      })
    }
  }

  create(): void {
    // Sanitize ADD/SCREEN-blend V2 textures to eliminate alpha-floor rectangles.
    // Runs once here — before PlayScene creates any sprites — so all subsequent
    // texture lookups see the cleaned data.
    if (this.textures.exists('v2-fog-soft')) {
      for (const { key, threshold } of V2_SANITIZE) {
        this.sanitizeAlphaTexture(key, threshold)
      }
    }

    this.scene.start('PlayScene')
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Sanitize a loaded Phaser texture in-place: any pixel whose alpha ≤ threshold
   * is set to alpha = 0.  Eliminates faint rectangular alpha floors that become
   * visible when ADD or SCREEN blend modes are used.
   *
   * Algorithm:
   *   1. Draw source image into a same-size off-screen canvas.
   *   2. Read all pixel data with getImageData().
   *   3. Walk alpha channel; clamp values ≤ threshold to 0.
   *   4. Write back with putImageData() if any pixels were changed.
   *   5. Remove the original Phaser texture entry and re-register the canvas.
   *
   * Must be called after preload() has completed loading the texture.
   * Runs in O(W×H) time; executed once at boot, not per-frame.
   */
  private sanitizeAlphaTexture(key: string, threshold: number): void {
    if (!this.textures.exists(key)) return

    const tex = this.textures.get(key)
    // getSourceImage() returns the HTMLImageElement / HTMLCanvasElement backing the frame.
    const src = tex.getSourceImage() as HTMLImageElement & HTMLCanvasElement
    const w = src.naturalWidth  || src.width  || 0
    const h = src.naturalHeight || src.height || 0
    if (w === 0 || h === 0) return

    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(src, 0, 0)

    const imageData = ctx.getImageData(0, 0, w, h)
    const data      = imageData.data
    let clamped     = 0

    // Walk the alpha channel only — every 4th byte starting at index 3.
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] <= threshold) {
        data[i] = 0
        clamped++
      }
    }

    if (clamped === 0) return  // texture already clean; skip replace

    ctx.putImageData(imageData, 0, 0)

    // Replace the Phaser texture in-place (same key → no sprite key changes needed).
    this.textures.remove(key)
    this.textures.addCanvas(key, canvas)
  }

  private supportsWebp(): boolean {
    try {
      const canvas = document.createElement('canvas')
      if (!canvas.getContext) {
        return false
      }
      return canvas.toDataURL('image/webp').startsWith('data:image/webp')
    } catch {
      return false
    }
  }
}
