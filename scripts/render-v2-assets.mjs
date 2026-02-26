#!/usr/bin/env node
/**
 * render-v2-assets.mjs
 *
 * Renders each Evil Forest V2 SVG source file to PNG (via Playwright + Chrome),
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
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'public/assets/theme/evil_forest_v2/src')
const OUT_DIR = path.join(ROOT, 'public/assets/theme/evil_forest_v2')

/** All layers to render. w×h are the canvas/viewport dimensions. */
const LAYERS = [
  { name: 'bg_sky_far',               w: 1024, h: 640 },
  { name: 'bg_mountains',             w: 1024, h: 640 },
  { name: 'bg_trees_far',             w: 1024, h: 640 },
  { name: 'bg_trees_mid',             w: 1024, h: 640 },
  { name: 'bg_swamp_near',            w: 1024, h: 640 },
  { name: 'fg_branches',              w: 1024, h: 640 },
  { name: 'light_rays',               w: 1024, h: 640 },
  { name: 'water_reflection_mask',    w: 1024, h: 640 },
  { name: 'fog_tile_soft',            w:  512, h: 512 },
  { name: 'biolume_glow_splotches',   w:  512, h: 512 },
]

async function renderAll() {
  // Use system Chrome (channel:'chrome') — avoids needing Playwright headless shell download
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ deviceScaleFactor: 1 })

  for (const layer of LAYERS) {
    const svgPath = path.join(SRC_DIR, `${layer.name}.svg`)
    const pngPath = path.join(OUT_DIR, `${layer.name}.png`)
    const webpPath = path.join(OUT_DIR, `${layer.name}.webp`)

    console.log(`Rendering ${layer.name} (${layer.w}×${layer.h})...`)

    // Read the SVG source and encode it as a data URI
    const svgSource = readFileSync(svgPath, 'utf8')
    const encoded = Buffer.from(svgSource).toString('base64')
    const dataUri = `data:image/svg+xml;base64,${encoded}`

    // Create a minimal HTML page that renders the SVG at exact pixel dimensions
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
