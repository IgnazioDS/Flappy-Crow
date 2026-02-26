import type Phaser from 'phaser'

/**
 * TextureSanitizer — boot-time pixel cleanup for additive-blend overlay textures.
 *
 * ─── Root Cause ───────────────────────────────────────────────────────────────
 * ADD and SCREEN blend modes read source RGB **independently of source alpha**.
 * A pixel with RGB=(200,200,200) and alpha=0 still contributes its full colour
 * to every destination pixel it overlaps, producing a solid white rectangular
 * plate where the sprite bounding box is.
 *
 * The previous sanitizeAlphaTexture() only zeroed the alpha channel; the non-black
 * RGB values remained, so ADD mode kept adding them.
 *
 * ─── Fix ──────────────────────────────────────────────────────────────────────
 * sanitizeAdditiveTexture() walks every pixel.  For any pixel whose alpha is
 * ≤ alphaThreshold it sets r=g=b=0 AND a=0.  This removes the RGB contribution
 * entirely from transparent regions so ADD/SCREEN blending produces no plate.
 *
 * ─── Thresholds ───────────────────────────────────────────────────────────────
 * SVG ambient gradients leave alpha 1–28 at sprite edges; glow cores have
 * alpha >> 50.  The thresholds in V2_SANITIZE_MANIFEST are conservative: they
 * strip the invisible fringe without touching real glow data.
 *
 * ─── Sanitised-copy architecture (v6.2.0) ─────────────────────────────────────
 * Instead of in-place replacement (dstKey === srcKey), BootScene now creates a
 * separate sanitised copy under `dstKey` while leaving the original texture
 * untouched.  BackgroundSystem renders using the `dstKey` variants so the
 * rendered sprites are guaranteed to use clean data regardless of whether
 * in-place canvas manipulation could fail silently (WebGL texture caching, etc.).
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 * Call from BootScene.create() before PlayScene starts:
 *
 *   for (const { key, dstKey, threshold } of V2_SANITIZE_MANIFEST) {
 *     sanitizeAdditiveTexture(this, key, dstKey, threshold)  // copy, not in-place
 *   }
 *
 * BackgroundSystem renders using dstKey variants ('v2-biolume-san', etc.)
 * so the GPU never touches the original (potentially dirty) texture data.
 * Pass dstKey === srcKey for legacy in-place behaviour if needed.
 *
 * ─── Performance ──────────────────────────────────────────────────────────────
 * O(W×H) per texture.  Runs once at boot, never per-frame.
 */

// ─── Shared manifest ────────────────────────────────────────────────────────

/**
 * All V2 textures used with ADD or SCREEN blend modes that need full RGB+alpha
 * sanitization.  Shared between BootScene (sanitization) and BackgroundSystemV2
 * (QA corner-α overlay) to prevent threshold drift between the two.
 *
 * Each entry has:
 *   key       — original texture key loaded from disk in BootScene.preload()
 *   dstKey    — sanitised-copy key created by BootScene.create(); rendered by
 *               BackgroundSystem so sprites never read the original dirty data
 *   label     — short name for QA overlay display
 *   threshold — pixels with alpha ≤ this value are zeroed (r=g=b=a=0)
 *
 * Thresholds (v6.2.0 — lower than v6.1.9 because source assets were re-exported
 * clean in v6.1.10; runtime sanitization is defence-in-depth only):
 *
 *   • biolume     24  — SVG ambient re-exported at peak alpha≈20 (v6.1.9 SVG fix +
 *                       v6.1.10 re-export); threshold 24 comfortably catches fringe
 *                       while preserving all intentional glow data (alpha ≥ 35).
 *   • light_rays  14  — source_glow 80% stop (alpha≈20) zeroed in v6.1.10 export;
 *                       threshold 14 catches any residual fringe below the ray edge.
 *   • fog_tile    10  — NORMAL blend, hygiene sanitization only.
 *   • water_mask   6  — BitmapMask, near-binary; threshold 6 is unchanged.
 */
export const V2_SANITIZE_MANIFEST: ReadonlyArray<{
  key: string
  dstKey: string
  label: string
  threshold: number
}> = [
  { key: 'v2-biolume',    dstKey: 'v2-biolume-san',    label: 'biolume',    threshold: 24 },
  { key: 'v2-light-rays', dstKey: 'v2-light-rays-san', label: 'light_rays', threshold: 14 },
  { key: 'v2-fog-soft',   dstKey: 'v2-fog-soft-san',   label: 'fog_tile',   threshold: 10 },
  { key: 'v2-water-mask', dstKey: 'v2-water-mask-san', label: 'water_mask', threshold:  6 },
]

// ─── Types ──────────────────────────────────────────────────────────────────

/** RGBA sample from a single pixel location in a Phaser texture. */
export type PixelSample = {
  label: string
  r: number
  g: number
  b: number
  a: number
}

// ─── Core sanitizer ─────────────────────────────────────────────────────────

/**
 * Sanitize a loaded Phaser texture for use with ADD or SCREEN blend modes.
 *
 * For each pixel where `alpha ≤ alphaThreshold`, sets r=g=b=a=0 (true
 * black-transparent).  Pixels above the threshold are kept as-is.
 *
 * If `dstKey === srcKey` the original texture entry is removed and a new
 * canvas texture is registered under the same key (in-place replacement —
 * no downstream sprite key changes required).  If `dstKey` differs, a new
 * canvas texture is registered under `dstKey` and the original is untouched.
 *
 * Algorithm:
 *   1. Retrieve the source image from the Phaser TextureManager.
 *   2. Draw it onto an off-screen canvas.
 *   3. Walk every pixel (4 bytes per pixel):
 *        if a ≤ threshold → r=g=b=a=0
 *   4. Write back with putImageData() if any pixels were changed.
 *   5. Register the canvas under `dstKey` (removing `dstKey` first if present).
 *
 * @param scene          Active Phaser scene (for TextureManager access).
 * @param srcKey         Key of the already-loaded source texture.
 * @param dstKey         Destination key.  Pass srcKey for in-place replacement.
 * @param alphaThreshold Pixels with alpha ≤ this value are zeroed (0–255).
 * @returns              `true` if the texture was processed; `false` if srcKey missing.
 */
export function sanitizeAdditiveTexture(
  scene: Phaser.Scene,
  srcKey: string,
  dstKey: string,
  alphaThreshold: number,
): boolean {
  if (!scene.textures.exists(srcKey)) return false

  const tex = scene.textures.get(srcKey)
  const src = tex.getSourceImage() as HTMLImageElement & HTMLCanvasElement
  const w   = src.naturalWidth  || src.width  || 0
  const h   = src.naturalHeight || src.height || 0
  if (w === 0 || h === 0) return false

  const canvas  = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  ctx.drawImage(src, 0, 0)

  const imageData = ctx.getImageData(0, 0, w, h)
  const data      = imageData.data
  let sanitized   = 0

  //
  // Critical fix vs. v6.1.7:
  //   v6.1.7 walked `i = 3; i += 4` — touching data[i] (alpha only).
  //   ADD/SCREEN blend modes read source RGB independently of source alpha,
  //   so leaving non-black RGB in transparent pixels still adds a visible plate.
  //   We now zero ALL four channels when alpha ≤ threshold.
  //
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= alphaThreshold) {
      data[i]     = 0   // R → black
      data[i + 1] = 0   // G → black
      data[i + 2] = 0   // B → black
      data[i + 3] = 0   // A → fully transparent
      sanitized++
    }
  }

  if (sanitized === 0 && scene.textures.exists(dstKey)) return true  // already clean

  ctx.putImageData(imageData, 0, 0)

  if (scene.textures.exists(dstKey)) {
    scene.textures.remove(dstKey)
  }
  scene.textures.addCanvas(dstKey, canvas)
  return true
}

// ─── QA probe ───────────────────────────────────────────────────────────────

/**
 * Sample RGBA values at six strategic points of a loaded Phaser texture:
 * four corners + left-edge mid-point + centre.
 *
 * The centre sample (CTR) is especially important for the biolume texture:
 * the ambient radialGradient peaks at ≈(42%, 48%) — near the texture centre —
 * so the 4-corner check alone gives a false "clean" result while the
 * plate-causing pixels remain undetected.
 *
 * Creates a temporary off-screen canvas to read pixel data.  Run once at boot
 * for ART_QA logging — never per-frame.
 *
 * @param scene Phaser scene used to access the TextureManager.
 * @param key   Phaser texture key to inspect.
 * @returns     Array of six PixelSamples, or empty array if texture not found.
 */
export function sampleTextureRGBA(scene: Phaser.Scene, key: string): PixelSample[] {
  if (!scene.textures.exists(key)) return []

  const tex = scene.textures.get(key)
  const src = tex.getSourceImage() as HTMLImageElement & HTMLCanvasElement
  const w   = src.naturalWidth  || src.width  || 0
  const h   = src.naturalHeight || src.height || 0
  if (w === 0 || h === 0) return []

  const canvas  = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.drawImage(src, 0, 0)

  const points: Array<{ label: string; x: number; y: number }> = [
    { label: 'TL',  x: 0,                 y: 0                  },
    { label: 'TR',  x: w - 1,             y: 0                  },
    { label: 'BL',  x: 0,                 y: h - 1              },
    { label: 'BR',  x: w - 1,             y: h - 1              },
    { label: 'ML',  x: 0,                 y: Math.floor(h / 2)  },
    { label: 'CTR', x: Math.floor(w / 2), y: Math.floor(h / 2)  },
  ]

  return points.map(({ label, x, y }) => {
    const d = ctx.getImageData(x, y, 1, 1).data
    return { label, r: d[0], g: d[1], b: d[2], a: d[3] }
  })
}
