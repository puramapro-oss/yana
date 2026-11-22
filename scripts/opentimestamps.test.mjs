import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(resolve(process.env.YANA_TEST_DEPENDENCY_ROOT || root, 'package.json'))
assert.equal(require('opentimestamps/package.json').version, '0.4.9')
const primitives = Object.fromEntries(Object.entries({
  DetachedTimestampFile: 'detached-timestamp-file', Ops: 'ops', Context: 'context',
  Timestamp: 'timestamp', Notary: 'notary',
}).map(([key, name]) => [key, require(`opentimestamps/src/${name}.js`)]))
const calendar = 'https://alice.btc.calendar.opentimestamps.org'
const digest = value => crypto.createHash('sha256').update(value).digest()
const decode = value => primitives.DetachedTimestampFile.deserialize(Buffer.from(value, 'base64'))

function serialize(timestamp) {
  const context = new primitives.Context.StreamSerialization()
  timestamp.serialize(context)
  return new Uint8Array(context.getOutput())
}
function pendingResponse(init, uri = calendar) {
  const timestamp = new primitives.Timestamp(Array.from(init.body))
  timestamp.attestations.push(new primitives.Notary.PendingAttestation(uri))
  return new Response(serialize(timestamp))
}
async function library({ fetch: providerFetch, globals = {} } = {}) {
  const calls = []
  const context = vm.createContext({
    TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Array, URL, Response, Buffer,
    AbortController, setTimeout, clearTimeout, crypto: crypto.webcrypto, performance,
    fetch: async (input, init) => {
      const url = new URL(String(input))
      calls.push({ url, init })
      assert.equal(init.method, 'POST')
      assert.equal(init.redirect, 'error')
      assert.equal(init.credentials, 'omit')
      assert.equal(url.pathname, '/digest')
      assert.ok([
        'https://a.pool.opentimestamps.org', 'https://b.pool.opentimestamps.org',
        'https://a.pool.eternitywall.com', 'https://ots.btc.catallaxy.com',
      ].includes(url.origin))
      if (providerFetch) return providerFetch(url, init)
      return pendingResponse(init)
    }, ...globals,
  })
  const cache = new Map()
  function load(file) {
    if (!cache.has(file)) cache.set(file, new vm.SourceTextModule(
      stripTypeScriptTypes(readFileSync(file, 'utf8'), { mode: 'transform' }), { context, identifier: file },
    ))
    return cache.get(file)
  }
  const entry = load(resolve(root, 'src/lib/opentimestamps.ts'))
  await entry.link((specifier, parent) => {
    if (specifier === 'node:crypto') return new vm.SyntheticModule(['default'], function () {
      this.setExport('default', crypto)
    }, { context })
    if (specifier.startsWith('opentimestamps/src/')) return new vm.SyntheticModule(['default'], function () {
      this.setExport('default', require(specifier))
    }, { context })
    assert.ok(specifier.startsWith('.'), `Unplanned import: ${specifier}`)
    return load(resolve(dirname(parent.identifier), specifier))
  })
  await entry.evaluate()
  return { ots: entry.namespace, calls }
}

const fixtures = JSON.parse(readFileSync(new URL('./opentimestamps-fixtures.json', import.meta.url), 'utf8'))
for (const fixture of fixtures.fixtures) test(`official .ots receipt remains readable: ${fixture.name}`, () => {
  const bytes = Buffer.from(fixture.proof_base64, 'base64')
  assert.equal(digest(bytes).toString('hex'), fixture.proof_sha256)
  const proof = decode(fixture.proof_base64)
  assert.equal(Buffer.from(proof.fileDigest()).toString('hex'), fixture.content_sha256)
  assert.deepEqual(Buffer.from(proof.serializeToBytes()), bytes)
  const timestampBytes = serialize(proof.timestamp)
  const context = new primitives.Context.StreamDeserialization(timestampBytes)
  const timestamp = primitives.Timestamp.deserialize(context, proof.fileDigest())
  context.assertEof()
  assert.deepEqual(serialize(timestamp), timestampBytes, 'Official timestamps retain exact canonical encoding')
})

test('SHA256 helpers preserve exact UTF-8 content and the standard abc vector', async () => {
  const { ots, calls } = await library()
  assert.equal(ots.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.deepEqual(ots.sha256Bytes('arbre — café 🌳'), digest('arbre — café 🌳'))
  assert.equal(calls.length, 0)
})

test('stampHashHex retains raw digest semantics, including uppercase hex', async () => {
  const { ots, calls } = await library()
  const hash = digest('plantation intent')
  const proof = decode(await ots.stampHashHex(hash.toString('hex').toUpperCase()))
  assert.deepEqual(Buffer.from(proof.fileDigest()), hash)
  assert.notDeepEqual(Buffer.from(proof.fileDigest()), digest(hash))
  assert.ok(proof.timestamp.allAttestations().size > 0)
  assert.equal(calls.length, 4)
  for (const call of calls) {
    assert.equal(call.init.body.length, 32)
    assert.notDeepEqual(Buffer.from(call.init.body), hash, 'A private nonce must blind the original digest')
  }
})

test('stampString retains its hash and receipt API', async () => {
  const { ots } = await library()
  const text = '{"intention":"un arbre 🌳","user_id":"fixture-only"}'
  const result = await ots.stampString(text)
  assert.equal(result.hash, digest(text).toString('hex'))
  assert.equal(Buffer.from(decode(result.ots_proof_base64).fileDigest()).toString('hex'), result.hash)
})

test('malformed hashes are rejected before any calendar request', async () => {
  const { ots, calls } = await library()
  const valid = 'ab'.repeat(32)
  for (const value of ['', '00', 'ab'.repeat(33), valid + 'xyz', valid + ' ', valid + 'f', '0x' + valid, 'z'.repeat(64), null, undefined, 42, Buffer.alloc(32)]) {
    assert.equal(await ots.stampHashHex(value), null)
  }
  assert.equal(calls.length, 0)
})

for (const mode of ['all fail', 'only one accepts', 'unattested']) test(`calendar failure never returns a bare receipt: ${mode}`, async () => {
  let requests = 0
  const { ots, calls } = await library({ fetch: async (_url, init) => {
    requests++
    if (mode === 'only one accepts' && requests === 1) return pendingResponse(init)
    if (mode === 'unattested') return new Response(serialize(new primitives.Timestamp(Array.from(init.body))))
    throw new Error('fixture outage')
  } })
  const result = await ots.stampString('request retained after outage')
  assert.equal(result.hash, digest('request retained after outage').toString('hex'))
  assert.equal(result.ots_proof_base64, null)
  assert.equal(calls.length, 4)
})

test('two available calendars suffice when the other two fail', async () => {
  let requests = 0
  const { ots } = await library({ fetch: async (_url, init) => {
    if (++requests <= 2) return pendingResponse(init)
    throw new Error('fixture outage')
  } })
  const proof = decode(await ots.stampHashHex('ab'.repeat(32)))
  assert.deepEqual(Buffer.from(proof.fileDigest()), Buffer.from('ab'.repeat(32), 'hex'))
})

for (const mode of ['http failure', 'redirect', 'declared oversize', 'streamed oversize', 'trailing bytes', 'wrong content length', 'foreign attestation', 'excessive depth']) {
  test(`untrusted calendar response is rejected: ${mode}`, async () => {
    const { ots } = await library({ fetch: async (_url, init) => {
      if (mode === 'http failure') return new Response('offline', { status: 503 })
      if (mode === 'redirect') {
        const response = pendingResponse(init)
        Object.defineProperty(response, 'redirected', { value: true })
        return response
      }
      if (mode === 'declared oversize') return new Response('x', { headers: { 'content-length': '10001' } })
      if (mode === 'streamed oversize') return new Response(new Uint8Array(10001))
      if (mode === 'foreign attestation') return pendingResponse(init, 'http://127.0.0.1/private')
      if (mode === 'excessive depth') {
        const timestamp = new primitives.Timestamp(Array.from(init.body))
        let tip = timestamp
        for (let i = 0; i < 66; i++) tip = tip.add(new primitives.Ops.OpSHA256())
        tip.attestations.push(new primitives.Notary.PendingAttestation(calendar))
        return new Response(serialize(timestamp))
      }
      const good = new Uint8Array(await pendingResponse(init).arrayBuffer())
      if (mode === 'trailing bytes') return new Response(Buffer.concat([good, Buffer.from([255])]))
      return new Response(good, { headers: { 'content-length': String(good.length + 1) } })
    } })
    assert.equal(await ots.stampHashHex('ab'.repeat(32)), null)
  })
}

for (const mode of ['outer payload overrun', 'inner URI overrun', 'ignored pending payload byte',
  'non-minimal outer length', 'non-minimal URI length', 'empty Bitcoin payload',
  'unterminated Bitcoin height', 'ignored Bitcoin payload byte', 'non-minimal operation length']) {
  test(`malformed internal proof lengths are rejected: ${mode}`, async () => {
    const { ots } = await library({ fetch: async (_url, init) => {
      let bytes = new Uint8Array(await pendingResponse(init).arrayBuffer())
      assert.equal(bytes[9], bytes.length - 10, 'A one-byte attestation payload length precedes the URI')
      if (mode === 'outer payload overrun') bytes[9]++
      if (mode === 'inner URI overrun') bytes[10]++
      if (mode === 'ignored pending payload byte') {
        bytes[9]++
        bytes = Buffer.concat([bytes, Buffer.from([0])])
      }
      if (mode === 'non-minimal outer length') {
        bytes = Buffer.concat([bytes.slice(0, 9), Buffer.from([bytes[9] | 0x80, 0]), bytes.slice(10)])
      }
      if (mode === 'non-minimal URI length') {
        bytes[9]++
        bytes = Buffer.concat([bytes.slice(0, 10), Buffer.from([bytes[10] | 0x80, 0]), bytes.slice(11)])
      }
      if (mode.includes('Bitcoin')) {
        const timestamp = new primitives.Timestamp(Array.from(init.body))
        timestamp.attestations.push(new primitives.Notary.BitcoinBlockHeaderAttestation(1))
        bytes = serialize(timestamp)
        if (mode === 'empty Bitcoin payload') { bytes[9] = 0; bytes = bytes.slice(0, -1) }
        if (mode === 'unterminated Bitcoin height') bytes[10] = 0x80
        if (mode === 'ignored Bitcoin payload byte') { bytes[9]++; bytes = Buffer.concat([bytes, Buffer.from([0])]) }
      }
      if (mode === 'non-minimal operation length') {
        const timestamp = new primitives.Timestamp(Array.from(init.body))
        timestamp.add(new primitives.Ops.OpAppend([0x42])).add(new primitives.Ops.OpSHA256())
          .attestations.push(new primitives.Notary.PendingAttestation(calendar))
        bytes = serialize(timestamp)
        assert.equal(bytes[1], 1)
        bytes = Buffer.concat([bytes.slice(0, 1), Buffer.from([0x81, 0]), bytes.slice(2)])
      }
      return new Response(bytes)
    } })
    assert.equal(await ots.stampHashHex('ab'.repeat(32)), null)
  })
}

for (const mode of ['fetch ignores abort', 'body never settles', 'cancel never settles']) test(`total deadline releases caller when ${mode}`, async () => {
  let cancelled = 0
  const timers = []
  const { ots, calls } = await library({
    globals: {
      setTimeout(callback, ms) { timers.push(ms); return setTimeout(callback, 10) },
    },
    fetch: async () => {
      if (mode === 'fetch ignores abort') return new Promise(() => {})
      return {
        status: 200, redirected: false, headers: new Headers(),
        body: { getReader: () => ({
          read: () => new Promise(() => {}),
          cancel() { cancelled++; return mode === 'cancel never settles' ? new Promise(() => {}) : Promise.resolve() },
          releaseLock() {},
        }) },
      }
    },
  })
  const started = performance.now()
  assert.equal(await ots.stampHashHex('ab'.repeat(32)), null)
  assert.ok(performance.now() - started < 2000)
  assert.deepEqual(timers, [10000, 10000, 10000, 10000])
  assert.ok(calls.every(call => call.init.signal.aborted))
  if (mode !== 'fetch ignores abort') assert.equal(cancelled, 4)
})

test('loading and stamping do not load the legacy request transport or entry point', async () => {
  const { ots } = await library()
  await ots.stampHashHex('ab'.repeat(32))
  for (const path of Object.keys(require.cache)) {
    assert.doesNotMatch(path, /\/node_modules\/(?:request|request-promise|request-promise-core|web3)\//)
    assert.doesNotMatch(path, /\/opentimestamps\/(?:index|open-timestamps)\.js$/)
  }
})
