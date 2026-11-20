import { expect, test } from '@playwright/test'

test('la cible répond avec l’identité YANA', async ({ request }) => {
  const response = await request.get('/api/status')
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ app: 'YANA', status: 'ok' })
})
