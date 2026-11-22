// Runs the actual route source with only network/data boundaries replaced.
// No Supabase connection, OTS endpoint, provider, or environment secret is used.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const sourceRoot = path.resolve(process.env.YANA_TEST_SOURCE_ROOT || process.argv[2] || path.join(dirname, '..'))
const moduleRoot = process.env.YANA_TEST_MODULES || path.join(sourceRoot, 'node_modules')
const testRequire = createRequire(path.join(moduleRoot, '_offline_test.cjs'))
const ts = testRequire('typescript')
const zod = testRequire('zod')
const USER = '00000000-0000-4000-8000-000000000001'
const CO2_PER_TREE = 10
const clone = value => structuredClone(value)

class FakeDatabase {
  constructor(options = {}) {
    this.options = options
    this.profile = {
      id: USER,
      co2_offset_total_kg: options.co2 ?? 10,
      trees_planted_total: options.initialCounter ?? 0,
    }
    this.trees = Array.from({ length: options.initialLedgerCount ?? 0 }, (_, index) => ({
      id: `existing-synthetic-${index}`, user_id: USER, tree_count: 1,
    }))
    this.events = []
    this.preparedReceipts = 0
    this.reads = 0
    this.releaseReads = null
    this.readBarrier = new Promise(resolve => { this.releaseReads = resolve })
    this.rpcTail = Promise.resolve()
  }

  from(table) { return new Query(this, table) }

  async readProfiles(query) {
    this.reads += 1
    // Capture before the barrier: both requests see the same committed snapshot.
    const snapshot = clone(this.profile)
    this.events.push({ type: 'profile_read', counter: snapshot.trees_planted_total })
    if (this.options.readBarrier === this.reads) this.releaseReads()
    if (this.options.readBarrier) await this.readBarrier
    if (this.options.readError) return { data: null, error: { message: 'synthetic read failure' } }
    return { data: query.isSingle ? snapshot : [snapshot], error: null }
  }

  // Boundary model for the proposed RPC, not proof of PostgreSQL atomicity.
  rpc(name, args) {
    assert.equal(name, 'record_manual_tree_pledge')
    const promise = this.rpcTail.then(async () => {
      this.events.push({ type: 'rpc', counter: this.profile.trees_planted_total })
      const co2 = Number(this.profile.co2_offset_total_kg)
      const counter = this.profile.trees_planted_total
      const result = (error_code, tree = null) => ({
        data: { error_code, tree, co2_offset_total_kg: co2, trees_planted_total: this.profile.trees_planted_total },
        error: null,
      })
      if (!Number.isFinite(co2) || co2 < 0 || !Number.isInteger(counter) || counter < 0) return result('invalid_profile')
      if (this.trees.reduce((sum, tree) => sum + tree.tree_count, 0) !== counter) return result('reconciliation_required')
      if (counter >= Math.floor(co2 / CO2_PER_TREE)) return result('not_eligible')
      if (this.options.insertError || this.options.updateError) {
        this.events.push({ type: 'rpc_rollback' })
        return { data: null, error: { message: 'synthetic write failure' } }
      }
      const tree = {
        id: `synthetic-tree-${this.trees.length + 1}`, user_id: args.p_user_id,
        trip_id: args.p_trip_id, provider: 'manual', tree_count: 1,
        co2_offset_kg: CO2_PER_TREE, cost_cents: 0, certificate_url: null,
        ots_proof: args.p_ots_proof,
      }
      this.trees.push(tree)
      this.profile.trees_planted_total += 1
      return result(null, clone(tree))
    })
    this.rpcTail = promise.then(() => undefined)
    return { single: () => promise, then: (resolve, reject) => promise.then(resolve, reject) }
  }
}

class Query {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.operation = 'select'
    this.isSingle = false
  }
  select() { return this }
  eq() { return this }
  gte() { return this }
  order() { return this }
  limit() { return this }
  insert(payload) { this.operation = 'insert'; this.payload = payload; return this }
  update(payload) { this.operation = 'update'; this.payload = payload; return this }
  maybeSingle() { this.isSingle = true; return this }
  single() { this.isSingle = true; return this }
  then(resolve, reject) { return this.execute().then(resolve, reject) }

  async execute() {
    if (this.table === 'profiles' && this.operation === 'select') return this.db.readProfiles(this)
    if (this.table === 'trees_planted' && this.operation === 'insert') {
      this.db.events.push({ type: 'tree_insert', error: Boolean(this.db.options.insertError) })
      if (this.db.options.insertError) return { data: null, error: { message: 'synthetic insert failure' } }
      const tree = { id: `synthetic-tree-${this.db.trees.length + 1}`, ...clone(this.payload) }
      this.db.trees.push(tree)
      return { data: this.isSingle ? clone(tree) : null, error: null }
    }
    if (this.table === 'profiles' && this.operation === 'update') {
      this.db.events.push({ type: 'profile_update', counter: this.payload.trees_planted_total, error: Boolean(this.db.options.updateError) })
      if (this.db.options.updateError) return { data: null, error: { message: 'synthetic update failure' } }
      Object.assign(this.db.profile, clone(this.payload))
      return { data: null, error: null }
    }
    throw new Error(`Unexpected offline query ${this.table}/${this.operation}`)
  }
}

function loadRoute(relative, db) {
  const filename = path.join(sourceRoot, relative)
  const javascript = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  const imports = {
    zod,
    'next/server': { NextResponse: { json: (value, options) => Response.json(value, options) } },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: USER } } }) } }) },
    '@/lib/supabase': { createServiceClient: () => db },
    '@/lib/co2': { CO2_TO_TREE_KG: CO2_PER_TREE },
    '@/lib/tree-nation': { plantTree: async () => {
      db.preparedReceipts += 1
      return { provider: 'manual', external_id: null, certificate_url: null, ots_proof: 'synthetic-receipt', payload_hash: 'synthetic-hash' }
    } },
  }
  const sandbox = {
    module: mod, exports: mod.exports, Request, Response, URL, console,
    process: { env: { CRON_SECRET: 'synthetic-audit-only' } },
    fetch: () => { throw new Error('NETWORK FORBIDDEN in offline reproduction') },
    require: specifier => {
      if (!Object.hasOwn(imports, specifier)) throw new Error(`Unmocked import: ${specifier}`)
      return imports[specifier]
    },
  }
  vm.runInNewContext(javascript, sandbox, { filename, timeout: 1000 })
  return mod.exports
}

function handlers(db) {
  const claim = loadRoute('src/app/api/trees/plant/route.ts', db)
  const cron = loadRoute('src/app/api/cron/plant-trees/route.ts', db)
  return {
    claim: async () => {
      const response = await claim.POST(new Request('https://synthetic.invalid/api/trees/plant', { method: 'POST', body: '{}' }))
      return { status: response.status, body: await response.json() }
    },
    cron: async () => {
      const response = await cron.POST(new Request('https://synthetic.invalid/api/cron/plant-trees', { method: 'POST', headers: { authorization: 'Bearer synthetic-audit-only' } }))
      return { status: response.status, body: await response.json() }
    },
  }
}

const tests = [
  { name: 'single claim succeeds', options: {}, actions: ['claim'], expectedRows: 1, expectedCounter: 1, statuses: [200] },
  { name: 'cron insert failure leaves credit available', options: { insertError: true }, actions: ['cron'], expectedRows: 0, expectedCounter: 0, statuses: [500] },
  { name: 'claim counter update failure rolls back receipt', options: { updateError: true }, actions: ['claim'], expectedRows: 0, expectedCounter: 0, statuses: [500] },
  { name: 'two concurrent claims consume one threshold once', options: { readBarrier: 2 }, actions: ['claim', 'claim'], expectedRows: 1, expectedCounter: 1, statuses: [200, 400] },
  { name: 'concurrent claim and cron consume one threshold once', options: { readBarrier: 2 }, actions: ['claim', 'cron'], expectedRows: 1, expectedCounter: 1 },
  { name: 'two concurrent cron runs consume three thresholds once', options: { co2: 30, readBarrier: 2 }, actions: ['cron', 'cron'], expectedRows: 3, expectedCounter: 3 },
  { name: 'historical row without counter refuses new claim', options: { initialLedgerCount: 1 }, actions: ['claim'], expectedRows: 1, expectedCounter: 0, statuses: [409], preserveMismatch: true },
  { name: 'historical counter without row refuses new claim', options: { co2: 20, initialCounter: 1 }, actions: ['claim'], expectedRows: 0, expectedCounter: 1, statuses: [409], preserveMismatch: true },
]

async function main() {
  const evidence = []
  for (const test of tests) {
    const db = new FakeDatabase(test.options)
    const route = handlers(db)
    const responses = await Promise.all(test.actions.map(action => route[action]()))
    const observed = {
      rows: db.trees.length,
      sum_tree_count: db.trees.reduce((sum, tree) => sum + tree.tree_count, 0),
      counter: db.profile.trees_planted_total,
      eligible: Math.floor(Number(db.profile.co2_offset_total_kg) / CO2_PER_TREE),
      statuses: responses.map(response => response.status).sort(),
      responses,
      events: db.events,
      prepared_receipts: db.preparedReceipts,
    }
    let failure = null
    try {
      assert.equal(observed.rows, test.expectedRows, 'committed row count')
      assert.equal(observed.counter, test.expectedCounter, 'profile counter')
      if (!test.preserveMismatch) assert.equal(observed.counter, observed.sum_tree_count, 'counter equals committed rows')
      assert.ok(observed.counter <= observed.eligible, 'counter does not exceed earned threshold')
      if (test.statuses) assert.deepEqual(observed.statuses, [...test.statuses].sort(), 'HTTP reports actual result')
    } catch (error) { failure = error.message }
    evidence.push({ name: test.name, status: failure ? 'FAIL' : 'PASS', failure, observed })
    process.stdout.write(`${failure ? 'FAIL' : 'PASS'} ${test.name}: rows=${observed.rows}, counter=${observed.counter}, HTTP=${observed.statuses.join(',')}\n`)
  }
  const report = {
    source_root: sourceRoot,
    dependency_versions: { typescript: ts.version, zod: testRequire('zod/package.json').version },
    scope: 'Actual handler execution with synthetic Supabase and OTS boundaries; RPC model is not a PostgreSQL test.',
    network: 'forbidden', real_data: false,
    passed: evidence.filter(test => test.status === 'PASS').length,
    failed: evidence.filter(test => test.status === 'FAIL').length,
    evidence,
  }
  if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), JSON.stringify(report, null, 2) + '\n')
  process.stdout.write(`RESULT ${report.passed} passed, ${report.failed} failed\n`)
  if (report.failed) process.exitCode = 1
}

export { handlers, FakeDatabase, USER }
if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  main().catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1 })
}
