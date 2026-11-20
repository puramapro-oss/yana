import { expect, test } from '@playwright/test'

test('ouvrir la connexion depuis l’accueil YANA', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/\bYANA\b/i)
  await page.locator('a[href="/login"]').first().click()
  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/)
  await expect(page.locator('input[type="email"]')).toBeVisible()
})
