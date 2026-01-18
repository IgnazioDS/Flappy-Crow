import { test, expect } from '@playwright/test'

type FlappyDebugState = {
  state: string
  reducedMotion: boolean
}

test('reduced motion can be enabled from storage and toggled off', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('flappy-reduced-motion', 'true')
  })

  await page.goto('/')

  const waitForState = (state: string) =>
    page.waitForFunction((desired) => {
      const win = window as Window & { __flappyDebug?: FlappyDebugState }
      return win.__flappyDebug?.state === desired
    }, state)

  await waitForState('READY')

  const initial = await page.evaluate(() => {
    const win = window as Window & { __flappyDebug?: FlappyDebugState }
    return win.__flappyDebug?.reducedMotion
  })
  expect(initial).toBe(true)

  await page.keyboard.press('R')
  await page.waitForFunction(() => {
    const win = window as Window & { __flappyDebug?: FlappyDebugState }
    return win.__flappyDebug?.reducedMotion === false
  })
})
