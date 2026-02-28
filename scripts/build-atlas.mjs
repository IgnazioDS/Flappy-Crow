#!/usr/bin/env node
/**
 * build-atlas.mjs
 *
 * Renders all sprite SVG sources and composites them onto the 1024×1024
 * atlas PNG (public/assets/theme/atlas.png + atlas.webp).
 *
 * Source SVG locations:
 *   Sprite frames  — public/assets/theme/src/sprites/<name>.svg
 *   Icon frames    — public/assets/ui/v2/icon_<name>.svg
 *   Medal frames   — public/assets/ui/v2/medal_<name>.svg
 *   UI frames      — public/assets/theme/src/ui/<name>.svg
 *
 * Usage:
 *   node scripts/build-atlas.mjs [--frame <name>]  (rebuild one frame)
 *   node scripts/build-atlas.mjs                    (rebuild full atlas)
 *
 * Requirements: Playwright (@playwright/test), system Chrome, cwebp in PATH.
 */

import { chromium } from 'playwright'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.resolve(__dirname, '..')
const SPRITE_DIR = path.join(ROOT, 'public/assets/theme/src/sprites')
const UI_DIR     = path.join(ROOT, 'public/assets/theme/src/ui')
const ICON_DIR   = path.join(ROOT, 'public/assets/ui/v2')
const OUT_PNG    = path.join(ROOT, 'public/assets/theme/atlas.png')
const OUT_WEBP   = path.join(ROOT, 'public/assets/theme/atlas.webp')

const ATLAS_W = 1024
const ATLAS_H = 1024

/**
 * Atlas frame manifest.
 * Each entry maps a frame key to:
 *   svgPath  — absolute path to the SVG source
 *   x, y     — position in the atlas
 *   w, h     — rendered frame dimensions (SVG is scaled to fit)
 */
const FRAMES = [
  // ── Crow sprites ─────────────────────────────────────────────────────────
  { key: 'crow_idle',    svg: path.join(SPRITE_DIR, 'crow_idle.svg'),    x:   0, y: 0, w: 96, h: 64 },
  { key: 'crow_flap_0', svg: path.join(SPRITE_DIR, 'crow_flap_0.svg'),  x:  96, y: 0, w: 96, h: 64 },
  { key: 'crow_flap_1', svg: path.join(SPRITE_DIR, 'crow_flap_1.svg'),  x: 192, y: 0, w: 96, h: 64 },
  { key: 'crow_flap_2', svg: path.join(SPRITE_DIR, 'crow_flap_2.svg'),  x: 288, y: 0, w: 96, h: 64 },
  { key: 'crow_flap_3', svg: path.join(SPRITE_DIR, 'crow_flap_3.svg'),  x: 384, y: 0, w: 96, h: 64 },
  { key: 'crow_dead',   svg: path.join(SPRITE_DIR, 'crow_dead.svg'),    x: 480, y: 0, w: 96, h: 64 },
  { key: 'crow_glow',   svg: path.join(SPRITE_DIR, 'crow_glow.svg'),    x: 576, y: 0, w: 32, h: 32 },

  // ── Icons (24×24) ─────────────────────────────────────────────────────────
  { key: 'icon_restart',    svg: path.join(ICON_DIR, 'icon_restart.svg'),    x: 608, y: 0, w: 24, h: 24 },
  { key: 'icon_mute_on',   svg: path.join(ICON_DIR, 'icon_mute_on.svg'),    x: 640, y: 0, w: 24, h: 24 },
  { key: 'icon_mute_off',  svg: path.join(ICON_DIR, 'icon_mute_off.svg'),   x: 664, y: 0, w: 24, h: 24 },
  { key: 'icon_motion_on', svg: path.join(ICON_DIR, 'icon_motion_on.svg'),  x: 688, y: 0, w: 24, h: 24 },
  { key: 'icon_motion_off',svg: path.join(ICON_DIR, 'icon_motion_off.svg'), x: 712, y: 0, w: 24, h: 24 },

  // ── Medals (48×48 in atlas, SVG source is 48×56 — ribbon is cropped) ─────
  { key: 'medal_bronze',  svg: path.join(ICON_DIR, 'medal_bronze.svg'),   x: 736, y: 0, w: 48, h: 48 },
  { key: 'medal_silver',  svg: path.join(ICON_DIR, 'medal_silver.svg'),   x: 784, y: 0, w: 48, h: 48 },
  { key: 'medal_gold',    svg: path.join(ICON_DIR, 'medal_gold.svg'),     x: 832, y: 0, w: 48, h: 48 },
  { key: 'medal_void',    svg: path.join(ICON_DIR, 'medal_platinum.svg'), x: 880, y: 0, w: 48, h: 48 },

  // ── Gate columns (80×320) ─────────────────────────────────────────────────
  { key: 'gate_top_0',    svg: path.join(SPRITE_DIR, 'gate_top.svg'),     x:   0, y:  80, w: 80, h: 320 },
  { key: 'gate_top_1',    svg: path.join(SPRITE_DIR, 'gate_top_1.svg'),   x:  96, y:  80, w: 80, h: 320 },
  { key: 'gate_top_2',    svg: path.join(SPRITE_DIR, 'gate_top_2.svg'),   x: 192, y:  80, w: 80, h: 320 },
  { key: 'gate_bottom_0', svg: path.join(SPRITE_DIR, 'gate_bottom.svg'),  x: 288, y:  80, w: 80, h: 320 },
  { key: 'gate_bottom_1', svg: path.join(SPRITE_DIR, 'gate_bottom_1.svg'),x: 384, y:  80, w: 80, h: 320 },
  { key: 'gate_bottom_2', svg: path.join(SPRITE_DIR, 'gate_bottom_2.svg'),x: 480, y:  80, w: 80, h: 320 },

  // ── UI panels ─────────────────────────────────────────────────────────────
  { key: 'ui_panel_large', svg: path.join(UI_DIR, 'ui_panel_large.svg'), x:   0, y: 420, w: 320, h: 180 },
  { key: 'ui_panel_small', svg: path.join(UI_DIR, 'ui_panel_small.svg'), x: 336, y: 420, w: 280, h: 120 },
  { key: 'ui_score_frame', svg: path.join(UI_DIR, 'ui_score_frame.svg'), x: 632, y: 420, w: 150, h:  54 },
  { key: 'ui_button',      svg: path.join(UI_DIR, 'ui_button.svg'),      x: 632, y: 480, w: 180, h:  52 },

  // ── Particles (16×16) ─────────────────────────────────────────────────────
  { key: 'particle_ember', svg: path.join(SPRITE_DIR, 'particle_ember.svg'), x:  0, y: 620, w: 16, h: 16 },
  { key: 'particle_dust',  svg: path.join(SPRITE_DIR, 'particle_dust.svg'),  x: 24, y: 620, w: 16, h: 16 },
  { key: 'particle_leaf',  svg: path.join(SPRITE_DIR, 'particle_leaf.svg'),  x: 48, y: 620, w: 16, h: 16 },
]

/** Convert a local SVG file to a base64 data URI. */
function svgToDataUri(svgPath) {
  const src = readFileSync(svgPath, 'utf8')
  return `data:image/svg+xml;base64,${Buffer.from(src).toString('base64')}`
}

/**
 * Render a single SVG to RGBA pixel data at the given dimensions.
 * Returns a Buffer of raw RGBA bytes (w × h × 4).
 */
async function renderFrame(context, frame) {
  if (!existsSync(frame.svg)) {
    console.warn(`  ⚠  Missing SVG for ${frame.key}: ${frame.svg}`)
    return null
  }

  const dataUri = svgToDataUri(frame.svg)
  const { w, h } = frame

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${w}px; height:${h}px; overflow:hidden; background:transparent; }
  img { width:${w}px; height:${h}px; display:block; }
</style>
</head>
<body>
  <img src="${dataUri}" width="${w}" height="${h}"/>
</body>
</html>`

  const page = await context.newPage()
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(html, { waitUntil: 'load' })

  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const png = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: w, height: h },
    omitBackground: true,
  })

  await page.close()
  return png
}

/**
 * Composite all rendered frames onto a 1024×1024 atlas canvas in the browser,
 * then capture as PNG.
 */
async function compositeAtlas(context, renderedFrames) {
  // Build a data-URI blob list for JS to load asynchronously
  const frameData = renderedFrames
    .filter(f => f.png !== null)
    .map(f => ({
      key: f.key,
      x: f.x,
      y: f.y,
      w: f.w,
      h: f.h,
      dataUri: `data:image/png;base64,${f.png.toString('base64')}`,
    }))

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; }
  html, body { width:${ATLAS_W}px; height:${ATLAS_H}px; overflow:hidden; background:transparent; }
  canvas { display:block; }
</style>
</head>
<body>
  <canvas id="c" width="${ATLAS_W}" height="${ATLAS_H}"></canvas>
  <script>
    window.__frames = ${JSON.stringify(frameData)};
    window.__done = false;
    (async () => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      for (const f of window.__frames) {
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, f.x, f.y, f.w, f.h); resolve(); };
          img.onerror = reject;
          img.src = f.dataUri;
        });
      }
      window.__done = true;
    })();
  </script>
</body>
</html>`

  const page = await context.newPage()
  await page.setViewportSize({ width: ATLAS_W, height: ATLAS_H })
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__done === true, { timeout: 30_000 })

  const atlasPng = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: ATLAS_W, height: ATLAS_H },
    omitBackground: true,
  })

  await page.close()
  return atlasPng
}

async function buildAtlas() {
  // Ensure src/ui dir exists (UI panel SVGs may be missing on first run)
  mkdirSync(UI_DIR, { recursive: true })

  // Parse optional --frame filter
  const frameFilter = (() => {
    const idx = process.argv.indexOf('--frame')
    return idx !== -1 ? process.argv[idx + 1] : null
  })()

  const framesToBuild = frameFilter
    ? FRAMES.filter(f => f.key === frameFilter)
    : FRAMES

  if (framesToBuild.length === 0) {
    console.error(`Frame "${frameFilter}" not found in manifest.`)
    process.exit(1)
  }

  console.log(`Building atlas (${framesToBuild.length} frame${framesToBuild.length !== 1 ? 's' : ''})…`)

  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ deviceScaleFactor: 1 })

  // ── Phase 1: render each frame individually ──────────────────────────────
  const renderedFrames = []
  for (const frame of framesToBuild) {
    process.stdout.write(`  Rendering ${frame.key} (${frame.w}×${frame.h})… `)
    const png = await renderFrame(context, frame)
    if (png) {
      console.log(`OK (${(png.length / 1024).toFixed(0)} KB)`)
      renderedFrames.push({ ...frame, png })
    } else {
      console.log('SKIPPED')
      renderedFrames.push({ ...frame, png: null })
    }
  }

  await browser.close()

  // ── Phase 2: load existing atlas and composite new frames into it ─────────
  // If rebuilding a subset, we must preserve existing pixels outside those frames.
  // Strategy: read existing atlas as base, then overdraw updated frames.
  let atlasPng

  if (frameFilter && existsSync(OUT_PNG)) {
    // Single-frame update: composite onto existing atlas
    console.log('\nCompositing single frame onto existing atlas…')
    const browser2 = await chromium.launch({ headless: true, channel: 'chrome' })
    const ctx2 = await browser2.newContext({ deviceScaleFactor: 1 })

    const existingUri = `data:image/png;base64,${readFileSync(OUT_PNG).toString('base64')}`
    const newFrames = renderedFrames.filter(f => f.png !== null).map(f => ({
      ...f,
      dataUri: `data:image/png;base64,${f.png.toString('base64')}`,
    }))

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>* { margin:0; padding:0; } html,body { width:${ATLAS_W}px; height:${ATLAS_H}px; background:transparent; } canvas { display:block; }</style>
</head>
<body>
  <canvas id="c" width="${ATLAS_W}" height="${ATLAS_H}"></canvas>
  <script>
    window.__done = false;
    window.__existing = "${existingUri}";
    window.__newFrames = ${JSON.stringify(newFrames.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h, dataUri: f.dataUri })))};
    (async () => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      // Draw existing atlas
      await new Promise((res, rej) => {
        const img = new Image(); img.onload = () => { ctx.drawImage(img, 0, 0); res(); }; img.onerror = rej; img.src = window.__existing;
      });
      // Overdraw new frames
      for (const f of window.__newFrames) {
        await new Promise((res, rej) => {
          const img = new Image(); img.onload = () => { ctx.clearRect(f.x, f.y, f.w, f.h); ctx.drawImage(img, f.x, f.y, f.w, f.h); res(); }; img.onerror = rej; img.src = f.dataUri;
        });
      }
      window.__done = true;
    })();
  </script>
</body>
</html>`

    const page = await ctx2.newPage()
    await page.setViewportSize({ width: ATLAS_W, height: ATLAS_H })
    await page.setContent(html, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__done === true, { timeout: 30_000 })
    atlasPng = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: ATLAS_W, height: ATLAS_H }, omitBackground: true })
    await page.close()
    await browser2.close()

  } else {
    // Full rebuild: composite all frames onto blank canvas
    console.log('\nCompositing full atlas…')
    const browser2 = await chromium.launch({ headless: true, channel: 'chrome' })
    const ctx2 = await browser2.newContext({ deviceScaleFactor: 1 })
    atlasPng = await compositeAtlas(ctx2, renderedFrames)
    await browser2.close()
  }

  // ── Phase 3: write outputs ─────────────────────────────────────────────────
  writeFileSync(OUT_PNG, atlasPng)
  console.log(`\n→ atlas.png  (${(atlasPng.length / 1024).toFixed(0)} KB)  ${OUT_PNG}`)

  execSync(`cwebp -q 90 "${OUT_PNG}" -o "${OUT_WEBP}"`, { stdio: 'pipe' })
  const webpSize = readFileSync(OUT_WEBP).length
  console.log(`→ atlas.webp (${(webpSize / 1024).toFixed(0)} KB)  ${OUT_WEBP}`)

  console.log('\n✓ Atlas build complete.')
}

buildAtlas().catch(err => {
  console.error(err)
  process.exit(1)
})
