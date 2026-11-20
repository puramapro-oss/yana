import { defineConfig, devices } from '@playwright/test'

const localURL = 'http://127.0.0.1:4100'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || localURL
// Les recettes historiques de VIDA-AIDE ont leur propre playwright.vida-aide.config.ts.
const navigation = '**/p8-cross-browser.spec.ts'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list']],
  use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 4100',
    url: localURL + '/api/status',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'identity', testMatch: '**/yana-target.spec.ts' },
    {
      name: 'chromium', dependencies: ['identity'],
      testMatch: [navigation, '**/responsive.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox', dependencies: ['identity'], testMatch: navigation,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit', dependencies: ['identity'], testMatch: navigation,
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
