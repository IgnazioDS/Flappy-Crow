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
 * ─── Usage ────────────────────────────────────────────────────────────────────
 * Call from BootScene.create() before PlayScene starts:
 *
 *   for (const { key, threshold } of V2_SANITIZE_MANIFEST) {
 *     sanitizeAdditiveTexture(this, key, key, threshold)   // in-place
 *   }
 *
 * In-place replacement (dstKey === srcKey) preserves all existing texture key
 * references so no downstream code needs to change.  Pass a different dstKey
 * to create a parallel sanitized copy without touching the original.
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
 * Thresholds (v6.1.9 — raised after ambient-gradient root-cause analysis):
 *
 *   • biolume     32  — biolume_glow_splotches.svg contains an "ambient tie-in"
 *                       radialGradient covering the full 512×512 canvas with a
 *                       peak stop-opacity="0.12" → alpha=31.  With threshold=24
 *                       those pixels survived and ADD-blended into a rectangular
 *                       plate the size of the entire sprite bounding box.
 *                       Threshold=32 catches alpha ≤ 31 (the full ambient layer)
 *                       while preserving all intentional glow data (cores and
 *                       mid-stops are alpha ≥ 35).  The SVG ambient is also
 *                       lowered to stop-opacity="0.08" (alpha=20) so future
 *                       re-exports are clean with the standard threshold=24.
 *   • light_rays  20  — source_glow radialGradient 80% stop has
 *                       stop-opacity="0.08" → alpha=20; old threshold=16 missed it.
 *   • fog_tile    12  — unchanged; normal blend, sanitize for hygiene
 *   • water_mask   6  — unchanged; BitmapMask, should be near-binary
 */
export const V2_SANITIZE_MANIFEST: ReadonlyArray<{
  key: string
  label: string
  threshold: number
}> = [
  { key: 'v2-biolume',    label: 'biolume',    threshold: 32 },  // ADD    — ambient peak = alpha 31
  { key: 'v2-light-rays', label: 'light_rays', threshold: 20 },  // SCREEN — source_glow 80% = alpha 20
  { key: 'v2-fog-soft',   label: 'fog_tile',   threshold: 12 },  // NORMAL (hygiene)
  { key: 'v2-water-mask', label: 'water_mask', threshold:  6 },  // BitmapMask
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
 * Sample RGBA values at five strategic points of a loaded Phaser texture:
 * four corners + left-edge mid-point.
 *
 * Creates a temporary off-screen canvas to read pixel data.  Run once at boot
 * for ART_QA logging — never per-frame.
 *
 * @param scene Phaser scene used to access the TextureManager.
 * @param key   Phaser texture key to inspect.
 * @returns     Array of five PixelSamples, or empty array if texture not found.
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
    { label: 'TL', x: 0,               y: 0               },
    { label: 'TR', x: w - 1,           y: 0               },
    { label: 'BL', x: 0,               y: h - 1           },
    { label: 'BR', x: w - 1,           y: h - 1           },
    { label: 'ML', x: 0,               y: Math.floor(h / 2) },
  ]

  return points.map(({ label, x, y }) => {
    const d = ctx.getImageData(x, y, 1, 1).data
    return { label, r: d[0], g: d[1], b: d[2], a: d[3] }
  })
}
