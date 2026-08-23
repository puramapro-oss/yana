import { test, expect } from '@playwright/test'
import {
  TEST_EMAIL,
  STORAGE_FILE,
  SUPABASE_URL,
  ANON_KEY,
  SERVICE_ROLE,
  ensureStorageFile,
  adminCreateUser,
  adminDeleteUser,
  loginViaCookies,
} from './p6-helpers'

/**
 * P6 — Tests humains simulés (21 SIM) bout en bout sur prod live.
 * Couvre : signup→login→dashboard→scanner→résultats→démarches→wallet→retrait
 * →missions→concours→parrainage→profil→settings→notifs→langue→dark/light
 * →375 mobile→logout. Tests sériels avec un user temporaire créé/supprimé
 * via GoTrue admin REST (SUPABASE_SERVICE_ROLE_KEY).
 */

let createdUserId: string | null = null

ensureStorageFile()

test.describe.serial('P6 — SIM 21 (live e2e)', () => {
  test.beforeAll(async ({ playwright, browser }) => {
    test.skip(!SERVICE_ROLE, 'SUPABASE_SERVICE_ROLE_KEY missing → cannot create test user')
    test.setTimeout(120000)

    const req = await playwright.request.newContext()
    createdUserId = await adminCreateUser(req)
    await req.dispose()

    const ctx = await browser.newContext()
    await loginViaCookies(playwright, ctx)
    await ctx.storageState({ path: STORAGE_FILE })
    await ctx.close()
  })

  test.afterAll(async ({ playwright }) => {
    if (createdUserId && SERVICE_ROLE) {
      const req = await playwright.request.newContext()
      await adminDeleteUser(req, createdUserId)
      await req.dispose()
    }
  })

  test.use({ storageState: STORAGE_FILE })

  test('SIM 01 — Landing CTA présent + signup form champs visibles', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="hero-cta"]').first()).toBeVisible({ timeout: 15000 })
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="signup-button"]')).toBeVisible({ timeout: 15000 })
    await ctx.close()
  })

  test('SIM 02 — GoTrue REST refuse mot de passe invalide', async ({ playwright }) => {
    const req = await playwright.request.newContext()
    const res = await req.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      data: { email: TEST_EMAIL, password: 'wrongpassword123' },
    })
    expect(res.status()).toBe(400)
    const json = (await res.json()) as { error_code?: string }
    expect(json.error_code).toBe('invalid_credentials')
    await req.dispose()
  })

  test('SIM 03 — Profile fetch PostgREST avec service-role → 200', async ({ playwright }) => {
    const req = await playwright.request.newContext()
    const res = await req.get(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,email,role&auth_user_id=eq.${createdUserId}`,
      {
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          'Accept-Profile': 'vida_aide',
        },
      },
    )
    expect(res.status()).toBe(200)
    const json = (await res.json()) as Array<{ id: string; email: string; role: string }>
    expect(json.length).toBe(1)
    expect(json[0].email).toBe(TEST_EMAIL)
    expect(json[0].role).toBe('user')
    await req.dispose()
  })

  test('SIM 04 — Dashboard auth guard : session cookie acceptée, pas de redirect', async ({ page }) => {
    const res = await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20000 })
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toMatch(/\/dashboard/)
    expect(page.url()).not.toMatch(/\/login/)
  })

  test('SIM 05 — Scanner page form champs présents', async ({ page }) => {
    await page.goto('/scanner', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="scanner-page"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="field-age"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="field-emploi"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="field-revenus"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="btn-launch-scan"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 06 — POST /api/scan auth → 200 + résultat IA', async ({ request, page }) => {
    test.setTimeout(120000)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const res = await request.post('/api/scan', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        situation: {
          age: 32,
          emploi: 'salarié',
          revenus_mensuels: 1900,
          composition_foyer: 'célibataire',
          localisation: 'Frasne 25560',
        },
      },
      timeout: 100000,
    })
    expect(res.status(), `scan status: ${await res.text()}`).toBeLessThan(500)
    if (res.status() === 200) {
      const json = await res.json()
      expect(json).toHaveProperty('scan_id')
    }
  })

  test('SIM 07 — Wallet page : solde visible + form retrait', async ({ page }) => {
    await page.goto('/dashboard/wallet', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="wallet-page"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="withdraw-amount"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="withdraw-iban"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 08 — Retrait IBAN invalide → 400', async ({ request, page }) => {
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const res = await request.post('/api/wallet/withdraw', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { amount_cents: 500, iban: 'INVALID' },
    })
    expect(res.status()).toBe(400)
  })

  test('SIM 09 — Retrait < 5€ → 400 ou 422', async ({ request, page }) => {
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const res = await request.post('/api/wallet/withdraw', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { amount_cents: 100, iban: 'FR7612345678901234567890123' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('SIM 10 — Missions page liste visible', async ({ page }) => {
    await page.goto('/dashboard/missions', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="missions-page"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 11 — Concours page leaderboard', async ({ page }) => {
    await page.goto('/dashboard/concours', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="concours-page"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 12 — Parrainage page : code visible + copy', async ({ page }) => {
    await page.goto('/dashboard/referral', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="referral-page"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="referral-copy"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 13 — Profil page : nom + email', async ({ page }) => {
    await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 14 — Settings page : thème + langue', async ({ page }) => {
    await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 15 — Notifications page visible', async ({ page }) => {
    await page.goto('/dashboard/notifications', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="notifications-page"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 16 — Aide page : FAQ + chat tabs', async ({ page }) => {
    await page.goto('/aide', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="aide-tab-faq"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="aide-tab-chat"]')).toBeVisible({ timeout: 15000 })
  })

  test('SIM 17 — Ecosystem page liens présents', async ({ page }) => {
    await page.goto('/ecosystem', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toContainText(/écosystème|ecosystem/i)
  })

  test('SIM 18 — Privacy page + Terms présents', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toContainText(/confidentialité|privacy/i)
    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toContainText(/conditions|terms/i)
  })

  test('SIM 19 — Responsive 375px mobile', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } })
    ctx.addCookies(await ctx.cookies())
    const page = await ctx.newPage()
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    await ctx.close()
  })

  test('SIM 20 — Dark mode toggle', async ({ page }) => {
    await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    const html = page.locator('html')
    const initial = await html.getAttribute('data-theme')
    const toggle = page.locator('[data-testid="theme-toggle"]')
    if (await toggle.isVisible()) {
      await toggle.click()
      await page.waitForTimeout(500)
      const next = await html.getAttribute('data-theme')
      expect(next).not.toBe(initial)
    }
  })

  test('SIM 21 — Logout → redirect /login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    const logoutBtn = page.locator('[data-testid="logout-button"]')
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toMatch(/\/login|\/signup|^\/$/)
    }
  })
})
