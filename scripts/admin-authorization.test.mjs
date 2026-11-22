import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import test from 'node:test'

const root = process.env.YANA_ADMIN_APP_ROOT || fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(resolve(process.env.YANA_ADMIN_DEPENDENCY_ROOT || root, 'package.json'))
const ts = require('typescript')
const { NextResponse } = require('next/server')
const { z } = require('zod')
const source = resolve(root, process.env.YANA_ADMIN_SOURCE || 'src/lib/admin.ts')
const owner = 'owner@fixture.invalid'
const member = { id: 'fixture-authenticated-id', email: 'member@fixture.invalid', email_confirmed_at: '2026-01-01T00:00:00Z' }
const denied = status => ({ ok: false, status, reason: status === 401 ? 'unauthenticated' : 'forbidden' })
const plain = value => JSON.parse(JSON.stringify(value))

async function harness(options = {}) {
  const calls = { auth: 0, service: 0, profile: 0, filters: [], selections: [] }
  const context = vm.createContext({ Request, Response, URL, Date,
    fetch: () => { throw new Error('Unexpected network request') }, process: { env: {} } })
  const user = Object.hasOwn(options, 'user') ? options.user : member
  const createServerSupabaseClient = async () => {
    if (options.serverThrows) throw new Error('fixture server setup rejected')
    return { auth: { getUser: async () => {
      calls.auth++
      if (options.authThrows) throw new Error('fixture Auth rejected')
      return { data: { user }, error: options.authError ?? null }
    } } }
  }
  const createServiceClient = () => {
    calls.service++
    if (options.serviceThrows) throw new Error('fixture service setup rejected')
    assert.equal(calls.service, 1, 'Denied routes must not access their privileged client')
    const query = {
      select(columns) { calls.selections.push(columns); return query },
      eq(column, value) { calls.filters.push([column, value]); return query },
      async maybeSingle() {
        calls.profile++
        if (options.profileThrows) throw new Error('fixture profile read rejected')
        return { data: options.profile ?? null, error: options.profileError ?? null }
      },
    }
    return { from(table) { assert.equal(table, 'profiles'); return query } }
  }
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
  }, { context })
  const compile = file => new vm.SourceTextModule(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, fileName: file,
  }).outputText, { context, identifier: file })
  const admin = compile(source)
  const dependencies = new Map([
    ['./supabase-server', synthetic({ createServerSupabaseClient })],
    ['./supabase', synthetic({ createServiceClient })],
    ['./constants', synthetic({ SUPER_ADMIN_EMAIL: owner })],
    ['@/lib/supabase', synthetic({ createServiceClient })],
    ['next/server', synthetic({ NextResponse })], ['zod', synthetic({ z })],
    ['@/lib/admin', admin],
  ])
  async function link(specifier) {
    if (dependencies.has(specifier)) return dependencies.get(specifier)
    if (specifier === '@/lib/contest-period') {
      const period = compile(resolve(root, 'src/lib/contest-period.ts'))
      dependencies.set(specifier, period)
      return period
    }
    throw new Error(`Unexpected import: ${specifier}`)
  }
  await admin.link(link)
  await admin.evaluate()
  return { calls, authorize: () => admin.namespace.requireSuperAdmin(),
    async route(path, method) {
      const route = compile(resolve(root, path))
      await route.link(link)
      await route.evaluate()
      return route.namespace[method](new Request('https://fixture.invalid/api/admin'), {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }),
      })
    } }
}

test('a forged owner email in a regular profile cannot authorize an admin action', async () => {
  const h = await harness({ profile: { role: 'user', email: owner } })
  assert.deepEqual(plain(await h.authorize()), denied(403))
})

test('a profile email cannot supply an Auth user with no email', async () => {
  const h = await harness({ user: { id: member.id, phone_confirmed_at: member.email_confirmed_at }, profile: { role: 'user', email: owner } })
  assert.deepEqual(plain(await h.authorize()), denied(403))
})

for (const [label, profile] of [['absent', null], ['stale email', { role: 'user', email: 'old@fixture.invalid' }]]) {
  test(`a confirmed Auth owner is accepted with an ${label} profile`, async () => {
    const h = await harness({ user: { ...member, email: owner }, profile })
    assert.deepEqual(plain(await h.authorize()), { ok: true, userId: member.id, email: owner })
    assert.equal(h.calls.service, 0, 'The Auth owner exception must not depend on mutable profile data')
  })
}

test('a confirmed Auth owner remains identifiable without a working profile service', async () => {
  const h = await harness({ user: { ...member, email: owner }, serviceThrows: true })
  assert.deepEqual(plain(await h.authorize()), { ok: true, userId: member.id, email: owner })
  assert.equal(h.calls.service, 0)
})

for (const confirmation of [undefined, null, '']) {
  test(`the owner address without email confirmation (${String(confirmation)}) is refused`, async () => {
    const h = await harness({ user: { ...member, email: owner, email_confirmed_at: confirmation,
      confirmed_at: member.email_confirmed_at, phone_confirmed_at: member.email_confirmed_at }, profile: { role: 'user', email: owner } })
    assert.deepEqual(plain(await h.authorize()), denied(403))
  })
}

test('the exact trusted owner identity is not broadened by case normalization', async () => {
  const h = await harness({ user: { ...member, email: owner.toUpperCase() }, profile: { role: 'user' } })
  assert.deepEqual(plain(await h.authorize()), denied(403))
})

test('a server super_admin role is preserved and the audit email comes only from Auth', async () => {
  const h = await harness({ profile: { role: 'super_admin', email: owner } })
  assert.deepEqual(plain(await h.authorize()), { ok: true, userId: member.id, email: member.email })
  assert.deepEqual(h.calls.filters, [['id', member.id]])
  assert.deepEqual(h.calls.selections, ['role'])
})

test('the server role remains valid without owner email confirmation', async () => {
  const h = await harness({ user: { ...member, email: owner, email_confirmed_at: null }, profile: { role: 'super_admin' } })
  assert.deepEqual(plain(await h.authorize()), { ok: true, userId: member.id, email: owner })
})

test('a valid server role never fills an absent Auth email from the profile', async () => {
  const h = await harness({ user: { id: member.id }, profile: { role: 'super_admin', email: owner } })
  assert.deepEqual(plain(await h.authorize()), { ok: true, userId: member.id, email: '' })
})

for (const role of [undefined, 'user', 'admin', 'moderator']) {
  test(`a missing or insufficient server role (${String(role)}) is forbidden`, async () => {
    const h = await harness({ profile: { role } })
    assert.deepEqual(plain(await h.authorize()), denied(403))
  })
}

for (const [label, options] of [
  ['missing user', { user: null }],
  ['Auth error despite a returned owner', { user: { ...member, email: owner }, authError: { message: 'fixture auth failure' } }],
  ['Auth rejection', { authThrows: true }],
  ['server client rejection', { serverThrows: true }],
]) {
  test(`${label} returns 401 before any privileged access`, async () => {
    const h = await harness({ ...options, profile: { role: 'super_admin', email: owner } })
    assert.deepEqual(plain(await h.authorize()), denied(401))
    assert.equal(h.calls.service, 0)
  })
}

for (const [label, options] of [
  ['profile error despite role data', { profileError: { message: 'fixture database error' } }],
  ['profile rejection', { profileThrows: true }],
  ['service client rejection', { serviceThrows: true }],
]) {
  test(`${label} cannot grant a server role and returns 403`, async () => {
    const h = await harness({ ...options, profile: { role: 'super_admin', email: owner } })
    assert.deepEqual(plain(await h.authorize()), denied(403))
  })
}

const routes = [
  ['contests/current', 'GET'], ['contests/trigger-closure', 'POST'], ['stats', 'GET'],
  ['tickets/[id]', 'POST'], ['tickets', 'GET'], ['users/[id]/ban', 'POST'],
  ['users', 'GET'], ['withdrawals/[id]', 'POST'], ['withdrawals', 'GET'],
]
for (const [route, method] of routes) for (const status of [401, 403]) {
  test(`the real ${method} ${route} handler stops at ${status} without privileged work`, async () => {
    const h = await harness(status === 401 ? { user: null } : { profile: { role: 'user', email: owner } })
    const response = await h.route(`src/app/api/admin/${route}/route.ts`, method)
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: denied(status).reason })
    assert.equal(h.calls.service, status === 401 ? 0 : 1)
  })
}
