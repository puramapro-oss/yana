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
const file = resolve(root, process.env.YANA_SUBSCRIPTION_SOURCE || 'src/app/(dashboard)/settings/abonnement/useSubscriptionStatus.ts')
const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let callback, effect
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'fetchStatus') callback = node.initializer.arguments[0]
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' && /fetchStatus|\/api\/subscription/.test(node.arguments[0].getText(source))) effect = node.arguments[0]
  ts.forEachChild(node, visit)
}
visit(source)
assert.ok(effect, 'Exercise the actual subscription effect, without copying its implementation')

function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => { resolvePromise = resolve })
  return { promise, resolve: resolvePromise }
}

function harness(fetch) {
  const writes = []
  const context = { fetch, AbortController, user: { id: 'fixture-user' },
    setLoading: value => writes.push(['loading', value]),
    setError: value => writes.push(['error', value]),
    setData: value => writes.push(['data', value]) }
  const code = ts.transpileModule(`${callback ? `globalThis.fetchStatus = ${callback.getText(source)};` : ''} globalThis.runEffect = ${effect.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, context)
  return { ...context, writes }
}

const response = body => ({ ok: true, json: async () => body })
const settle = () => new Promise(resolve => setImmediate(resolve))

test('mount read waits for the server before writing state', async () => {
  const pending = deferred(), h = harness(() => pending.promise)
  h.runEffect()
  const immediate = h.writes.slice()
  pending.resolve(response({ plan: 'free' }))
  await settle()
  assert.deepEqual(immediate, [])
  assert.deepEqual(h.writes, [['data', { plan: 'free' }], ['loading', false]])
})

test('HTTP failures and network rejections remain visible and release loading', async () => {
  for (const [fetch, message] of [
    [async () => ({ ok: false }), 'Impossible de charger ton abonnement. Réessaie.'],
    [async () => { throw new Error('fixture offline') }, 'Erreur réseau. Vérifie ta connexion.'],
  ]) {
    const h = harness(fetch)
    h.runEffect()
    await settle()
    assert.deepEqual(h.writes, [['error', message], ['loading', false]])
  }
})

test('an abandoned read cannot publish a later response', async () => {
  const pending = deferred(), h = harness(() => pending.promise)
  const cleanup = h.runEffect()
  h.writes.length = 0
  if (typeof cleanup === 'function') cleanup()
  pending.resolve(response({ plan: 'legende' }))
  await settle()
  assert.deepEqual(h.writes, [])
})

test('an abandoned JSON body cannot restore the previous account', async () => {
  const pending = deferred(), h = harness(async () => ({ ok: true, json: () => pending.promise }))
  const cleanup = h.runEffect()
  await settle()
  h.writes.length = 0
  if (typeof cleanup === 'function') cleanup()
  pending.resolve({ plan: 'legende' })
  await settle()
  assert.deepEqual(h.writes, [])
})

test('late rejected requests do not notify or stop a newer loading state', async () => {
  let rejectRequest
  const h = harness(() => new Promise((_resolve, reject) => { rejectRequest = reject }))
  const cleanup = h.runEffect()
  h.writes.length = 0
  if (typeof cleanup === 'function') cleanup()
  rejectRequest(new Error('fixture late failure'))
  await settle()
  assert.deepEqual(h.writes, [])
})

test('effect cleanup aborts the actual fetch signal and ignores noncooperative completion', async () => {
  const pending = deferred()
  let signal
  const h = harness((_url, options) => { signal = options.signal; return pending.promise })
  const cleanup = h.runEffect()
  h.writes.length = 0
  if (typeof cleanup === 'function') cleanup()
  pending.resolve(response({ plan: 'free' }))
  await settle()
  assert.equal(typeof cleanup, 'function')
  assert.equal(signal?.aborted, true)
  assert.deepEqual(h.writes, [])
})
