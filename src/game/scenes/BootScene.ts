import Phaser from 'phaser'
import { getActiveTheme } from '../theme'
import { getEnvironmentAssets } from '../theme/env'
import {
  sanitizeAdditiveTexture,
  sampleTextureRGBA,
  V2_SANITIZE_MANIFEST,
} from '../graphics/TextureSanitizer'

/**
 * Preloads visual assets before gameplay starts, then sanitizes ADD/SCREEN-blend
 * textures so rectangular artifact plates cannot appear at runtime.
 *
 * ─── Why sanitization is needed ───────────────────────────────────────────────
 * SVG ambient gradients leave alpha 1–28 at sprite edges even when rendered with
 * omitBackground:true.  ADD and SCREEN blend modes read source RGB independently
 * of source alpha, so even alpha=1 pixels with RGB=(200,200,200) contribute a
 * white halo that manifests as a solid rectangular plate matching the sprite
 * bounding box.
 *
 * ─── What this does ───────────────────────────────────────────────────────────
 * sanitizeAdditiveTexture() walks each pixel once (O(W×H)) and sets r=g=b=a=0
 * for every pixel whose alpha ≤ threshold.  It runs in create() — after all
 * textures are loaded but before PlayScene creates any sprites.
 *
 * v6.2.0: Creates sanitised copies under separate `dstKey` names ('v2-*-san')
 * instead of replacing the originals in-place.  BackgroundSystem renders using
 * only the '-san' keys, so if the canvas drawImage/getImageData path were to
 * fail silently the plate cannot appear (sprites would simply be missing their
 * texture, which is visible and diagnosable).
 *
 * ─── v6.1.7 → v6.1.8 regression fix ─────────────────────────────────────────
 * v6.1.7 sanitizeAlphaTexture() only zeroed alpha (walked `i=3; i+=4`).
 * RGB remained non-zero in "transparent" pixels, so ADD still showed them.
 * v6.1.8 uses sanitizeAdditiveTexture() which zeros ALL four channels.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    const theme       = getActiveTheme()
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
    // Only run V2 sanitization when the Evil Forest V2 textures are present.
    if (this.textures.exists('v2-biolume')) {

      // STEP 1 — ART_QA: Log corner+centre RGBA *before* sanitization.
      // Samples the original (possibly dirty) texture.  CTR is included because
      // the biolume ambient gradient peaks at ≈(42%, 48%) — never caught by the
      // 4-corner check alone.
      if (import.meta.env.VITE_ART_QA === 'true') {
        console.group('[ArtQA v6.2.0] Pre-sanitize RGBA (TL/TR/BL/BR/ML/CTR)')
        for (const { key, label } of V2_SANITIZE_MANIFEST) {
          const samples = sampleTextureRGBA(this, key)
          if (samples.length === 0) {
            console.log(`  ${label}: texture not loaded`)
            continue
          }
          const hasArtifact = samples.some(
            (s) => s.a <= 28 && (s.r > 0 || s.g > 0 || s.b > 0),
          )
          const flag = hasArtifact ? '⚠ RGB>0 in transparent — artifact risk' : '✓ clean'
          console.log(
            `  ${label.padEnd(12)} ${flag}`,
            '\n  ',
            samples.map((s) => `${s.label}=(${s.r},${s.g},${s.b},${s.a})`).join('  '),
          )
        }
        console.groupEnd()
      }

      // STEP 2 — Sanitize: create clean copies under dstKey ('v2-*-san').
      // Original textures (srcKey) are left untouched.  BackgroundSystem renders
      // using only the dstKey variants so the GPU never reads the originals.
      for (const { key, dstKey, threshold } of V2_SANITIZE_MANIFEST) {
        sanitizeAdditiveTexture(this, key, dstKey, threshold)
      }

      // STEP 3 — ART_QA: confirm the sanitised copies are clean.
      // All samples including CTR should be (0,0,0,0) after sanitization.
      if (import.meta.env.VITE_ART_QA === 'true') {
        console.group('[ArtQA v6.2.0] Post-sanitize RGBA on -san keys (expect all 0,0,0,0)')
        for (const { dstKey, label } of V2_SANITIZE_MANIFEST) {
          const samples = sampleTextureRGBA(this, dstKey)
          if (samples.length === 0) {
            console.log(`  ${label}: sanitised texture not found — sanitization failed`)
            continue
          }
          const dirty = samples.some((s) => s.r > 0 || s.g > 0 || s.b > 0 || s.a > 0)
          const flag = dirty ? '✗ STILL DIRTY' : '✓ clean'
          console.log(
            `  ${label.padEnd(12)} ${flag}`,
            '\n  ',
            samples.map((s) => `${s.label}=(${s.r},${s.g},${s.b},${s.a})`).join('  '),
          )
        }
        console.groupEnd()
      }
    }

    this.scene.start('PlayScene')
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

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
