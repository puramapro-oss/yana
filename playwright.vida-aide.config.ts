import { defineConfig, devices } from '@playwright/test'

// Les helpers de simulation utilisent cette variable pour leurs comptes de test.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:54321'

export default defineConfig({
  testDir: './tests',
  // Cette suite historique cible les parcours propres à VIDA-AIDE.
  testIgnore: ['**/p8-cross-browser.spec.ts', '**/yana-target.spec.ts'],
  timeout: 30000,
  retries: 1,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: process.env.VIDA_AIDE_BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
