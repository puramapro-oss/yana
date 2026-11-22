import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(resolve(process.env.YANA_TEST_UI_DEPENDENCY_ROOT || root, 'package.json'))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

// Execute the actual page and shared UI modules. Only useTrees' remote data is
// replaced; no browser, Supabase account, paid provider or external fetch is used.
function render(snapshot) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    function localRequire(specifier) {
      if (specifier === '@/hooks/useTrees') return { useTrees: () => snapshot }
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const path = specifier.startsWith('@/')
          ? resolve(root, 'src', specifier.slice(2)) : resolve(dirname(file), specifier)
        const candidates = extname(path) ? [path] : [path + '.ts', path + '.tsx', path + '/index.ts']
        for (const candidate of candidates) {
          try { readFileSync(candidate); return load(candidate) }
          catch (error) { if (error.code !== 'ENOENT') throw error }
        }
        throw new Error(`Unresolved local module ${specifier}`)
      }
      return require(specifier)
    }
    vm.runInNewContext(compiled, { module: mod, exports: mod.exports, require: localRequire, process, console, URL, Intl }, { filename: file })
    return mod.exports
  }
  const Page = load(resolve(root, 'src/app/(dashboard)/green/page.tsx')).default
  return renderToStaticMarkup(React.createElement(Page))
}

const stats = { trees_planted_total: 1, co2_offset_total_kg: 20, total_distance_km: 100, total_trips: 5, trees_available_to_claim: 1, kg_to_next_tree: 0 }
const tree = { id: 'fixture-tree', user_id: 'fixture-user', trip_id: null, provider: 'manual', tree_count: 1, co2_offset_kg: 10, cost_cents: 0, certificate_url: null, ots_proof: null, planted_at: '2026-11-21T12:00:00.000Z' }
const snapshot = { trees: [], stats, loading: false, error: null, claimTree: async () => ({ error: null }), refetch: () => {} }

test('a manual intent with an OTS receipt never appears as a confirmed Bitcoin proof or a planted tree', () => {
  const html = render({ ...snapshot, trees: [{ ...tree, ots_proof: 'fixture-receipt' }] })
  assert.match(html, /Demandes d’arbres/)
  assert.match(html, /plantation à confirmer/)
  assert.match(html, /Reçu OpenTimestamps disponible, ancrage Bitcoin non vérifié/)
  assert.match(html, /Demander ma plantation/)
  assert.doesNotMatch(html, /scellé blockchain|Scellé sur la blockchain|certifiés OTS|Planté le/)
})

test('an intent without a receipt stays visible and explicitly unconfirmed', () => {
  const html = render({ ...snapshot, trees: [tree] })
  assert.match(html, /plantation à confirmer · sans reçu OTS/)
  assert.doesNotMatch(html, /aria-label="Reçu OpenTimestamps disponible/)
  assert.match(html, /la demande reste enregistrée sans reçu/)
})

test('a provider-labelled record still does not claim Bitcoin verification', () => {
  const html = render({ ...snapshot, trees: [{ ...tree, provider: 'tree_nation', ots_proof: 'fixture-receipt' }] })
  assert.match(html, /demande transmise · reçu OTS disponible, ancrage non vérifié/)
  assert.doesNotMatch(html, /scellé blockchain|Scellé sur la blockchain/)
})

test('zero available claims keeps the existing business gate disabled', () => {
  const html = render({ ...snapshot, stats: { ...stats, trees_available_to_claim: 0, kg_to_next_tree: 10 } })
  assert.match(html, /<button[^>]*disabled=""[^>]*data-testid="green-claim"/)
  assert.match(html, /Ton prochain arbre se prépare/)
})

test('loading and network failures do not show fabricated tree counts', () => {
  const loading = render({ ...snapshot, loading: true, stats: null })
  assert.doesNotMatch(loading, /data-testid="green-stat-trees"/)
  const failed = render({ ...snapshot, error: 'Fixture réseau indisponible', stats: null })
  assert.match(failed, /Fixture réseau indisponible/)
  assert.match(failed, /Réessayer/)
  assert.doesNotMatch(failed, /data-testid="green-stat-trees"/)
})

test('a failed claim releases the actual click handler and allows another attempt', async () => {
  const file = resolve(root, 'src/app/(dashboard)/green/page.tsx')
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let selected
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'handleClaim') selected = node
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(selected, 'The actual click handler must be present')
  const state = [], errors = [], successes = []
  let calls = 0
  const context = {
    claiming: false, setClaiming: value => state.push(value),
    claimTree: async () => { if (++calls === 1) throw new Error('fixture offline'); return { error: null } },
    toast: { error: value => errors.push(value), success: value => successes.push(value) },
  }
  const code = ts.transpileModule(`${selected.getText(source)}\nglobalThis.actualHandler = handleClaim`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, context)
  await context.actualHandler()
  assert.deepEqual(state, [true, false])
  assert.equal(errors.length, 1)
  assert.equal(successes.length, 0)
  await context.actualHandler()
  assert.deepEqual(state, [true, false, true, false])
  assert.deepEqual(successes, ['Ta demande de plantation est enregistrée 🌱'])
})
