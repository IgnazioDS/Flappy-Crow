import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  webServer: {
    command:
      process.platform === 'win32'
        ? 'set VITE_TEST_SEED=1337&& set VITE_E2E=true&& npm run dev -- --host 127.0.0.1 --port 4173'
        : 'VITE_TEST_SEED=1337 VITE_E2E=true npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
