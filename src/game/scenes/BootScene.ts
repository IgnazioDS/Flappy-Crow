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
 * textures are loaded but before PlayScene creates any sprites — so all
 * downstream texture lookups see the cleaned data with no key changes required.
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

      // STEP 1 — ART_QA: Log corner RGBA *before* sanitization so the PR can
      // confirm RGB > 0 in near-transparent pixels (the artifact root cause).
      if (import.meta.env.DEV || import.meta.env.VITE_ART_QA === 'true') {
        const preSanitize = V2_SANITIZE_MANIFEST.map(({ key, label, threshold }) => ({
          key,
          label,
          threshold,
          samples: sampleTextureRGBA(this, key),
        }))
        const win = window as Window & {
          __artQaPreSanitize?: Array<{
            key: string
            label: string
            threshold: number
            samples: ReturnType<typeof sampleTextureRGBA>
          }>
        }
        win.__artQaPreSanitize = preSanitize

        console.group('[ArtQA v6.1.8] Pre-sanitize RGBA samples (corners+edges)')
        for (const { label, threshold, samples } of preSanitize) {
          if (samples.length === 0) {
            console.log(`  ${label}: texture not loaded`)
            continue
          }
          const hasArtifact = samples.some(
            (s) => s.a <= threshold && (s.r > 0 || s.g > 0 || s.b > 0),
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

      // STEP 2 — Sanitize: zero RGB+alpha for all low-alpha pixels.
      // In-place replacement (dstKey === srcKey) so no sprite key changes needed.
      for (const { key, threshold } of V2_SANITIZE_MANIFEST) {
        sanitizeAdditiveTexture(this, key, key, threshold)
      }

      // STEP 1 (post-sanitize confirmation in ART_QA mode).
      if (import.meta.env.DEV || import.meta.env.VITE_ART_QA === 'true') {
        const postSanitize = V2_SANITIZE_MANIFEST.map(({ key, label, threshold }) => ({
          key,
          label,
          threshold,
          samples: sampleTextureRGBA(this, key),
        }))
        const win = window as Window & {
          __artQaPostSanitize?: Array<{
            key: string
            label: string
            threshold: number
            samples: ReturnType<typeof sampleTextureRGBA>
          }>
        }
        win.__artQaPostSanitize = postSanitize

        console.group('[ArtQA v6.1.8] Post-sanitize RGBA samples (expect all 0,0,0,0)')
        for (const { label, samples } of postSanitize) {
          if (samples.length === 0) continue
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
