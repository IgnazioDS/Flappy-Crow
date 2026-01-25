import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const baseUrl = 'http://127.0.0.1:4173'
const theme = process.env.SCREENSHOT_THEME ?? 'classic'
const outRoot = path.join(root, 'docs', 'app-store', 'screenshots')

const devices = [
  { key: 'iphone_6.7', width: 1290, height: 2796 },
  { key: 'iphone_6.5', width: 1242, height: 2688 },
  { key: 'iphone_5.5', width: 1242, height: 2208 },
  { key: 'ipad_12.9', width: 2048, height: 2732 },
]

const scenes = [
  { key: 'ready', label: 'READY' },
  { key: 'playing', label: 'PLAYING' },
  { key: 'gameover', label: 'GAME_OVER' },
  { key: 'shop', label: 'SHOP' },
  { key: 'daily', label: 'DAILY' },
]

const waitForServer = async (url, retries = 60) => {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        return
      }
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const waitForState = async (page, desired) =>
  page.waitForFunction((state) => {
    const win = window
    return win.__flappyDebug?.state === state
  }, desired)

const run = async () => {
  const server = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_TEST_SEED: '1337',
        VITE_E2E: 'true',
        VITE_THEME: theme,
      },
    },
  )

  try {
    await waitForServer(baseUrl)
    await rm(outRoot, { recursive: true, force: true })
    await mkdir(outRoot, { recursive: true })

    for (const device of devices) {
      const deviceDir = path.join(outRoot, device.key)
      await mkdir(deviceDir, { recursive: true })
      const browser = await chromium.launch()
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: 1,
        isMobile: true,
      })
      const page = await context.newPage()
      await page.addInitScript((themeId) => {
        window.localStorage.setItem('flappy-theme', themeId)
      }, theme)
      await page.goto(baseUrl + '/')
      await waitForState(page, 'READY')

      for (const scene of scenes) {
        await page.evaluate(() => {
          window.__closeOverlays?.()
          window.__enterReady?.()
        })
        await waitForState(page, 'READY')

        if (scene.key === 'playing') {
          await page.evaluate(() => window.__startRun?.())
          await waitForState(page, 'PLAYING')
          await page.waitForTimeout(300)
        }

        if (scene.key === 'gameover') {
          await page.evaluate(() => window.__forceGameOver?.())
          await waitForState(page, 'GAME_OVER')
          await page.waitForTimeout(300)
        }

        if (scene.key === 'shop') {
          await page.evaluate(() => window.__openShop?.())
          await page.waitForTimeout(300)
        }

        if (scene.key === 'daily') {
          await page.evaluate(() => window.__openDaily?.())
          await page.waitForTimeout(300)
        }

        const filename = `${device.key}_${scene.key}_${theme}.png`
        const filepath = path.join(deviceDir, filename)
        await page.screenshot({ path: filepath })
        console.info(`Captured ${filepath}`)
      }

      await browser.close()
    }
  } finally {
    server.kill('SIGINT')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
