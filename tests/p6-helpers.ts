import type { APIRequestContext, BrowserContext } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auth.purama.dev'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzQwNTI0ODAwLCJleHAiOjE4OTgyOTEyMDB9.GkiVoEuCykK7vIpNzY_Zmc6XPNnJF3BUPvijXXZy2aU'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_DOMAIN = 'vida-aide.purama.dev'
const COOKIE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
const COOKIE_CHUNK_SIZE = 3180

export const RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1e6)}`
export const TEST_EMAIL = `pw-sim21-${RUN_ID}@test.purama.dev`
export const TEST_PASSWORD = `Sim21!${RUN_ID}aBc`
export const TEST_NAME = `SIM21 ${RUN_ID}`

export const STORAGE_DIR = path.join(__dirname, '.auth')
export const STORAGE_FILE = path.join(STORAGE_DIR, `sim21.json`)

export { SUPABASE_URL, ANON_KEY, SERVICE_ROLE, APP_DOMAIN }

export function ensureStorageFile() {
  if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true })
  if (!existsSync(STORAGE_FILE)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node:fs').writeFileSync(STORAGE_FILE, JSON.stringify({ cookies: [], origins: [] }))
  }
}

export async function adminCreateUser(req: APIRequestContext): Promise<string> {
  const res = await req.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: TEST_NAME },
    },
  })
  if (!res.ok()) {
    throw new Error(`adminCreateUser failed ${res.status()}: ${await res.text()}`)
  }
  const json = (await res.json()) as { id: string }
  return json.id
}

export async function adminDeleteUser(req: APIRequestContext, userId: string) {
  await req.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  })
}

export async function getSessionViaRest(req: APIRequestContext): Promise<Record<string, unknown>> {
  const res = await req.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  })
  if (!res.ok()) {
    throw new Error(`getSessionViaRest failed ${res.status()}: ${await res.text()}`)
  }
  return (await res.json()) as Record<string, unknown>
}

export function buildAuthCookies(session: Record<string, unknown>) {
  const sessionJSON = JSON.stringify(session)
  const encoded = 'base64-' + Buffer.from(sessionJSON, 'utf-8').toString('base64url')
  const encodedURI = encodeURIComponent(encoded)
  const baseAttrs = {
    domain: APP_DOMAIN,
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax' as const,
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }
  if (encodedURI.length <= COOKIE_CHUNK_SIZE) {
    return [{ ...baseAttrs, name: COOKIE_KEY, value: encoded }]
  }
  const chunks: { name: string; value: string }[] = []
  let remainingURI = encodedURI
  let i = 0
  while (remainingURI.length > 0) {
    let head = remainingURI.slice(0, COOKIE_CHUNK_SIZE)
    const lastEsc = head.lastIndexOf('%')
    if (lastEsc > COOKIE_CHUNK_SIZE - 3) head = head.slice(0, lastEsc)
    while (head.length > 0) {
      try {
        const decoded = decodeURIComponent(head)
        chunks.push({ name: `${COOKIE_KEY}.${i}`, value: decoded })
        i++
        remainingURI = remainingURI.slice(head.length)
        break
      } catch {
        if (head.at(-3) === '%' && head.length > 3) head = head.slice(0, head.length - 3)
        else throw new Error('cookie chunking failed')
      }
    }
  }
  return chunks.map((c) => ({ ...baseAttrs, name: c.name, value: c.value }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loginViaCookies(playwrightFx: any, browserContext: BrowserContext) {
  const req = await playwrightFx.request.newContext()
  const session = await getSessionViaRest(req)
  await req.dispose()
  const cookies = buildAuthCookies(session)
  await browserContext.addCookies(cookies)
}
