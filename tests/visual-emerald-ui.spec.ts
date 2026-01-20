import { test } from '@playwright/test'

test('emerald ui stat contrast pass', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('flappy-theme', 'emerald-lake')
    window.localStorage.setItem('flappy-contrast', 'normal')
    window.localStorage.setItem('flappy-text-scale', '1')
  })

  await page.goto('/')

  await page.waitForFunction(() => {
    const win = window as Window & { __flappyDebug?: { state?: string } }
    return win.__flappyDebug?.state === 'READY'
  })

  // Open settings panel (top-left).
  const box = await page.locator('canvas').boundingBox()
  if (!box) {
    throw new Error('Canvas not found')
  }
  const scaleX = box.width / 360
  const scaleY = box.height / 640
  await page.mouse.click(box.x + 44 * scaleX, box.y + 28 * scaleY)

  await page.screenshot({ path: 'test-results/emerald-settings.png' })
})
