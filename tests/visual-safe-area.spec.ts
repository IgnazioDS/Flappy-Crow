import { test } from '@playwright/test'

test('safe area overlays on notch viewport', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('flappy-theme', 'evil-forest')
  })

  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/')

  await page.addStyleTag({
    content: `
      :root {
        --safe-area-top: 44px;
        --safe-area-right: 0px;
        --safe-area-bottom: 34px;
        --safe-area-left: 0px;
      }
    `,
  })

  await page.waitForFunction(() => {
    const win = window as Window & { __flappyDebug?: { state?: string } }
    return win.__flappyDebug?.state === 'READY'
  })

  await page.screenshot({ path: 'test-results/safe-area-ready.png' })
})
