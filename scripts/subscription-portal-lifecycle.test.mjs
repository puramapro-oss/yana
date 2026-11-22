import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(resolve(process.env.YANA_TEST_UI_DEPENDENCY_ROOT || root, 'package.json'))
const ts = require('typescript')
const file = resolve(root, process.env.YANA_PORTAL_SOURCE || 'src/app/(dashboard)/settings/abonnement/useSubscriptionPortal.ts')
const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let handler, effect
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'openPortal') handler = node
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' && node.arguments[0].getText(source).includes('portalRequest')) effect = node.arguments[0]
  ts.forEachChild(node, visit)
}
visit(source)
assert.ok(handler, 'Exercise the actual click handler, without copying its logic')

function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => { resolvePromise = resolve })
  return { promise, resolve: resolvePromise }
}

function harness(fetch) {
  const writes = [], location = { href: 'fixture:unchanged' }, portalRequest = { current: null }
  const context = { fetch, AbortController, portalRequest, window: { location },
    setOpening: value => writes.push(['opening', value]),
    setPortalError: value => writes.push(['error', value]) }
  const code = ts.transpileModule(`${handler.getText(source)}; globalThis.run = openPortal; ${effect ? `globalThis.effect = ${effect.getText(source)};` : ''}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, context)
  const cleanup = context.effect?.()
  return { ...context, writes, location, unmount: () => cleanup?.() }
}

const response = body => ({ ok: true, json: async () => body })
const settle = () => new Promise(resolve => setImmediate(resolve))

test('a current portal response still navigates and releases its pending state', async () => {
  const h = harness(async () => response({ url: 'https://billing.stripe.com/p/session/fixture' }))
  await h.run()
  assert.equal(h.location.href, 'https://billing.stripe.com/p/session/fixture')
  assert.deepEqual(h.writes, [['opening', true], ['error', null], ['opening', false]])
})

test('a server refusal stays visible and permits retry', async () => {
  let calls = 0
  const h = harness(async () => { calls++; return { ok: false, json: async () => ({ error: 'fixture refused' }) } })
  await h.run(); await h.run()
  assert.equal(calls, 2)
  assert.equal(h.location.href, 'fixture:unchanged')
  assert.equal(h.writes.filter(([name, value]) => name === 'error' && value === 'fixture refused').length, 2)
})

for (const phase of ['response', 'JSON']) {
  test(`leaving the account during ${phase} cannot redirect or update the next page`, async () => {
    const pending = deferred()
    let signal
    const h = harness((_url, options) => {
      signal = options.signal
      return phase === 'response' ? pending.promise : Promise.resolve({ ok: true, json: () => pending.promise })
    })
    const work = h.run()
    await settle()
    h.unmount(); h.writes.length = 0
    pending.resolve(phase === 'response' ? response({ url: 'https://billing.stripe.com/p/session/old-account' }) : { url: 'https://billing.stripe.com/p/session/old-account' })
    await work
    assert.equal(h.location.href, 'fixture:unchanged')
    assert.equal(signal?.aborted, true)
    assert.deepEqual(h.writes, [])
  })
}

test('two clicks while pending issue one portal request', async () => {
  const pending = deferred()
  let calls = 0
  const h = harness(() => { calls++; return pending.promise })
  const first = h.run(), second = h.run()
  pending.resolve(response({ url: 'https://billing.stripe.com/p/session/fixture' }))
  await Promise.all([first, second])
  assert.equal(calls, 1)
})
