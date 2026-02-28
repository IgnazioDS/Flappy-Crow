#!/usr/bin/env node
/**
 * render-v2-assets.mjs
 *
 * Renders each Evil Forest V2 SVG source file to PNG (via Playwright + Chrome),
 * optionally runs a pixel-sanitize pass (zero RGB for transparent pixels),
 * then converts to WebP (via cwebp -q 85).
 *
 * Usage:
 *   node scripts/render-v2-assets.mjs
 *
 * Outputs (replaces existing files in public/assets/theme/evil_forest_v2/):
 *   bg_sky_far.png / .webp         1024×640
 *   bg_mountains.png / .webp       1024×640
 *   bg_trees_far.png / .webp       1024×640
 *   bg_trees_mid.png / .webp       1024×640
 *   bg_swamp_near.png / .webp      1024×640
 *   fg_branches.png / .webp        1024×640
 *   light_rays.png / .webp         1024×640
 *   water_reflection_mask.png/.webp 1024×640
 *   fog_tile_soft.png / .webp      512×512
 *   biolume_glow_splotches.png/.webp 512×512
 *
 * ─── Pixel sanitization (v6.1.8) ──────────────────────────────────────────────
 * For ADD / SCREEN-blend textures the export pipeline now runs a pixel-sanitize
 * pass *before* writing the PNG.  This prevents shipping "dirty" textures that
 * contain non-black RGB in near-transparent pixels.
 *
 * Root cause: SVG ambient gradients produce alpha 1–28 at sprite edges, but
 * leave non-black RGB (e.g. purple, teal, white) in those same pixels.  When
 * Phaser renders them with ADD or SCREEN blend modes the GPU reads RGB
 * independently of alpha, so even alpha=1 pixels with RGB=(200,200,200) produce
 * a visible rectangular plate matching the sprite bounding box.
 *
 * The sanitize pass (zero RGB+alpha for pixels where alpha ≤ threshold) is run
 * via page.evaluate() using the browser's Canvas 2D API so no extra Node
 * dependencies are required.  Runtime BootScene sanitization (TextureSanitizer)
 * remains as a defence-in-depth safety net for any future assets.
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT    = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'public/assets/theme/evil_forest_v2/src')
const OUT_DIR = path.join(ROOT, 'public/assets/theme/evil_forest_v2')

/**
 * All layers to render.  Fields:
 *   name             — SVG filename stem (without .svg / .png / .webp)
 *   w, h             — canvas / viewport dimensions in pixels
 *   sanitize         — if true, run pixel-sanitize pass before writing PNG
 *   sanitizeThreshold — pixels with alpha ≤ this value are zeroed (default 12)
 *
 * Only ADD / SCREEN-blend textures need `sanitize: true`.  Normal-blend layers
 * (bg_*, fg_branches, water_reflection_mask) do not need it.
 */
const LAYERS = [
  { name: 'bg_sky_far',             w: 1024, h: 640 },
  { name: 'bg_mountains',           w: 1024, h: 640 },
  { name: 'bg_trees_far',           w: 1024, h: 640 },
  { name: 'bg_trees_mid',           w: 1024, h: 640 },
  { name: 'bg_swamp_near',          w: 1024, h: 640 },
  { name: 'fg_branches',            w: 1024, h: 640 },
  { name: 'light_rays',             w: 1024, h: 640, sanitize: true, sanitizeThreshold: 20 },
  { name: 'water_reflection_mask',  w: 1024, h: 640 },
  { name: 'fog_tile_soft',          w:  512, h: 512, sanitize: true, sanitizeThreshold: 32 },
  { name: 'biolume_glow_splotches', w:  512, h: 512, sanitize: true, sanitizeThreshold: 32 },
]

/**
 * Sanitize transparent pixels in-browser via Canvas 2D API.
 *
 * Replaces the <img> in the page body with a <canvas> containing sanitized
 * pixel data.  The subsequent page.screenshot() then captures the clean canvas.
 *
 * Algorithm (matches TextureSanitizer.sanitizeAdditiveTexture):
 *   For each pixel where alpha ≤ threshold: r=g=b=a=0
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ w: number, h: number, sanitizeThreshold: number }} layer
 * @returns {Promise<number>} Number of pixels that were zeroed.
 */
async function sanitizePagePixels(page, layer) {
  return page.evaluate(({ w, h, threshold }) => {
    const img = document.querySelector('img')
    if (!img) return 0

    const canvas  = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, w, h)
    const data      = imageData.data
    let sanitized   = 0

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= threshold) {
        data[i]     = 0   // R
        data[i + 1] = 0   // G
        data[i + 2] = 0   // B
        data[i + 3] = 0   // A
        sanitized++
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Replace the <img> with the sanitized <canvas> so screenshot captures it.
    document.body.innerHTML = ''
    document.body.style.background = 'transparent'
    document.body.appendChild(canvas)

    return sanitized
  }, { w: layer.w, h: layer.h, threshold: layer.sanitizeThreshold ?? 12 })
}

async function renderAll() {
  // Use system Chrome (channel:'chrome') — avoids needing Playwright headless shell download
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ deviceScaleFactor: 1 })

  for (const layer of LAYERS) {
    const svgPath  = path.join(SRC_DIR, `${layer.name}.svg`)
    const pngPath  = path.join(OUT_DIR, `${layer.name}.png`)
    const webpPath = path.join(OUT_DIR, `${layer.name}.webp`)

    console.log(`Rendering ${layer.name} (${layer.w}×${layer.h})${layer.sanitize ? ' [sanitize]' : ''}...`)

    // Read the SVG source and encode it as a data URI
    const svgSource = readFileSync(svgPath, 'utf8')
    const encoded   = Buffer.from(svgSource).toString('base64')
    const dataUri   = `data:image/svg+xml;base64,${encoded}`

    // Minimal HTML page that renders the SVG at exact pixel dimensions.
    // background:transparent on html/body ensures omitBackground:true captures
    // only the SVG pixels (no white baking).
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${layer.w}px; height:${layer.h}px; overflow:hidden; background:transparent; }
  img { width:${layer.w}px; height:${layer.h}px; display:block; }
</style>
</head>
<body>
  <img src="${dataUri}" width="${layer.w}" height="${layer.h}"/>
</body>
</html>`

    const page = await context.newPage()
    await page.setViewportSize({ width: layer.w, height: layer.h })
    await page.setContent(html, { waitUntil: 'load' })

    // Wait for the image to finish rendering
    await page.waitForFunction(() => {
      const img = document.querySelector('img')
      return img && img.complete && img.naturalWidth > 0
    })

    // ── Pixel-sanitize pass (ADD/SCREEN-blend textures only) ──────────────────
    // Runs in the browser's Canvas 2D context — no extra Node dependencies.
    // Zeroes r=g=b=a for any pixel whose alpha ≤ sanitizeThreshold.
    // This prevents non-black RGB in near-transparent pixels from showing as
    // rectangular plates when Phaser uses ADD or SCREEN blend modes.
    if (layer.sanitize) {
      const sanitized = await sanitizePagePixels(page, layer)
      console.log(`  ✓ sanitized ${sanitized.toLocaleString()} transparent pixels (threshold=${layer.sanitizeThreshold ?? 12})`)
    }

    const pngBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: layer.w, height: layer.h },
      omitBackground: true,
    })
    await page.close()

    writeFileSync(pngPath, pngBuffer)
    console.log(`  → wrote ${pngPath} (${(pngBuffer.length / 1024).toFixed(0)} KB)`)

    // Convert to WebP with cwebp
    execSync(`cwebp -q 85 "${pngPath}" -o "${webpPath}"`, { stdio: 'pipe' })
    const webpSize = readFileSync(webpPath).length
    console.log(`  → wrote ${webpPath} (${(webpSize / 1024).toFixed(0)} KB)`)
  }

  await browser.close()
  console.log('\nAll layers rendered successfully.')
}

renderAll().catch((err) => {
  console.error(err)
  process.exit(1)
})
