import { test, expect } from '@playwright/test'

type FlappyDebugState = {
  state: string
  score: number
  bestScore: number
}

test('flappy smoke flow', async ({ page }) => {
  await page.goto('/')

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  const flap = async () => {
    await page.keyboard.press('Space')
  }

  const getDebugState = () =>
    page.evaluate(() => (window as Window & { __flappyDebug?: FlappyDebugState }).__flappyDebug)

  const waitForState = (state: string) =>
    page.waitForFunction((desired) => {
      const win = window as Window & { __flappyDebug?: FlappyDebugState }
      return win.__flappyDebug?.state === desired
    }, state)

  await waitForState('READY')

  await flap()
  await waitForState('PLAYING')

  await expect
    .poll(async () => (await getDebugState())?.score ?? 0, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1)

  await waitForState('GAME_OVER')

  await flap()
  await waitForState('READY')
})
