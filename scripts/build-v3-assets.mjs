/**
 * build-v3-assets.mjs — Export UI v3 SVGs to raster (PNG + WebP).
 *
 * Usage:
 *   node scripts/build-v3-assets.mjs
 *   node scripts/build-v3-assets.mjs --frame icon_home
 *
 * Requirements: node >=20, chromium (playwright), sharp
 *   npm install --save-dev playwright sharp
 *   npx playwright install chromium
 *
 * Output:
 *   public/assets/ui/v3/raster/<name>.png      (1×)
 *   public/assets/ui/v3/raster/<name>@2x.png   (2×)
 *   public/assets/ui/v3/raster/<name>.webp      (1×)
 *   public/assets/ui/v3/raster/<name>@2x.webp   (2×)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')
const V3DIR = resolve(ROOT, 'public/assets/ui/v3')
const SRC   = resolve(V3DIR, 'src')
const RAST  = resolve(V3DIR, 'raster')

const manifest = JSON.parse(readFileSync(resolve(V3DIR, 'manifest.json'), 'utf8'))

const targetFrame = process.argv.find((a, i) => process.argv[i - 1] === '--frame')

mkdirSync(RAST, { recursive: true })

// Dynamic imports — require chromium + sharp installed
const { chromium } = await import('playwright').catch(() => {
  console.error('playwright not installed. Run: npm install --save-dev playwright && npx playwright install chromium')
  process.exit(1)
})
const sharp = await import('sharp').catch(() => {
  console.error('sharp not installed. Run: npm install --save-dev sharp')
  process.exit(1)
})

const browser = await chromium.launch()
const page    = await browser.newPage()

for (const [name, info] of Object.entries(manifest.assets)) {
  if (!info.src) continue
  if (targetFrame && name !== targetFrame) continue

  const [w, h] = info.size
  const svgPath = resolve(SRC, info.src.replace('src/', ''))
  const svgContent = readFileSync(svgPath, 'utf8')

  console.log(`Exporting ${name} (${w}×${h})…`)

  for (const scale of [1, 2]) {
    const pw = w * scale
    const ph = h * scale

    await page.setViewportSize({ width: pw, height: ph })
    await page.setContent(`
      <!DOCTYPE html>
      <html><body style="margin:0;padding:0;background:transparent">
        <img src="data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}"
             width="${pw}" height="${ph}" style="display:block"/>
      </body></html>
    `)
    await page.waitForTimeout(50)

    const suffix = scale === 1 ? '' : '@2x'
    const pngPath  = resolve(RAST, `${name}${suffix}.png`)
    const webpPath = resolve(RAST, `${name}${suffix}.webp`)

    const pngBuf = await page.screenshot({ type: 'png', omitBackground: true })
    writeFileSync(pngPath, pngBuf)

    await sharp.default(pngBuf)
      .webp({ quality: 90, lossless: false })
      .toFile(webpPath)

    console.log(`  → ${name}${suffix}.png + .webp`)
  }
}

await browser.close()
console.log('Done.')
