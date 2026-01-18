import { test, expect } from '@playwright/test'

type FlappyDebugState = {
  state: string
  score: number
  bestScore: number
  seedMode: string
  seedLabel: string
}

test('daily seed label stays stable across reloads', async ({ page }) => {
  await page.goto('/?daily=1')

  const waitForState = (state: string) =>
    page.waitForFunction((desired) => {
      const win = window as Window & { __flappyDebug?: FlappyDebugState }
      return win.__flappyDebug?.state === desired
    }, state)

  await waitForState('READY')

  const firstLabel = await page.evaluate(() => {
    const win = window as Window & { __flappyDebug?: FlappyDebugState }
    return win.__flappyDebug?.seedLabel ?? ''
  })
  const firstMode = await page.evaluate(() => {
    const win = window as Window & { __flappyDebug?: FlappyDebugState }
    return win.__flappyDebug?.seedMode ?? ''
  })

  await page.reload()
  await waitForState('READY')

  const secondLabel = await page.evaluate(() => {
    const win = window as Window & { __flappyDebug?: FlappyDebugState }
    return win.__flappyDebug?.seedLabel ?? ''
  })
  const secondMode = await page.evaluate(() => {
    const win = window as Window & { __flappyDebug?: FlappyDebugState }
    return win.__flappyDebug?.seedMode ?? ''
  })

  expect(firstMode).toBe('daily')
  expect(secondMode).toBe('daily')
  expect(secondLabel).toBe(firstLabel)
})
