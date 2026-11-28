import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const ts = require('typescript')

// Exercise the real route and its schemas with a small in-memory Supabase adapter.
function moduleFor(path, overrides = {}) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
  const scope = { exports: {} }
  new Function('require', 'module', 'exports', compiled.outputText)(
    name => overrides[name] ?? require(name), scope, scope.exports,
  )
  return scope.exports
}

const original = {
  id: '74ae64f0-2551-4b1d-8d2d-c5c91907e1fe', driver_id: 'driver',
  from_city: 'Bouverans', to_city: 'Frasne', from_geohash: 'u0kq', to_geohash: 'u0kr',
  meeting_point_label: 'Gare', meeting_point_geohash: 'u0krv6',
  status: 'completed', seats_remaining: 0, prime_per_seat_cents: 290,
}
const future = new Date(Date.now() + 86_400_000).toISOString()
const options = { departure_at: future, seats_total: 2, price_per_seat_eur: 2.45, estimated_duration_min: 17 }
const repeat = { ...options, repeat_from_id: original.id }
const locations = { from_city: 'Bouverans', to_city: 'Frasne', from_lat: 46.85, from_lng: 6.20, to_lat: 46.86, to_lng: 6.16 }
const helpers = moduleFor('src/lib/carpool-repeat.ts')

function fixture(user = 'driver', status = 'completed') {
  const rows = [{ ...original, status }]
  const db = {
    from(table) {
      assert.ok(['profiles', 'carpools'].includes(table))
      let found = table === 'profiles' ? [{ id: user, role: 'user', onfido_status: 'approved' }] : rows
      let insert
      const q = {
        select() { return q },
        eq(key, value) { found = found.filter(row => row[key] === value); return q },
        maybeSingle() { return Promise.resolve({ data: found[0] ?? null, error: null }) },
        insert(value) { assert.equal(table, 'carpools'); insert = value; return q },
        single() {
          if (insert.id && rows.some(row => row.id === insert.id)) return { error: { code: '23505' }, data: null }
          const row = { ...insert, id: insert.id ?? 'fresh' }
          rows.push(row)
          return { data: row, error: null }
        },
      }
      return q
    },
  }
  const { POST } = moduleFor('src/app/api/carpool/create/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/carpool-repeat': helpers,
    '@/lib/geohash': moduleFor('src/lib/geohash.ts'),
    '@/lib/supabase': { createServiceClient: () => db },
    '@/lib/supabase-server': { createServerSupabaseClient: () => ({ auth: { getUser: () => ({ data: { user: { id: user } } }) } }) },
  })
  return {
    rows,
    publish: body => POST(new Request('http://localhost/api/carpool/create', { method: 'POST', body: JSON.stringify(body) })),
  }
}

test('republier garde les zones originales, ouvre les places et préserve le trajet terminé', async () => {
  const { rows, publish } = fixture()
  const first = await publish(repeat)
  assert.equal(first.status, 201)
  const { carpool } = await first.json()
  assert.equal(carpool.status, 'open')
  assert.equal(carpool.estimated_duration_min, 17)
  assert.equal(carpool.seats_remaining, 2)
  assert.equal(carpool.price_per_seat_cents, 245)
  assert.equal(carpool.from_geohash, original.from_geohash)
  assert.equal(carpool.meeting_point_geohash, original.meeting_point_geohash)
  assert.equal(carpool.prime_per_seat_cents, undefined)
  assert.deepEqual(rows[0], original)
  const retry = await publish(repeat)
  assert.equal(retry.status, 200)
  assert.equal((await retry.json()).carpool.id, carpool.id)
  assert.equal(rows.length, 2)
})

test('la replanification appartient au conducteur du trajet terminé', async () => {
  for (const args of [['passager', 'completed'], ['driver', 'cancelled'], ['driver', 'open']]) {
    const { rows, publish } = fixture(...args)
    assert.equal((await publish(repeat)).status, 404)
    assert.equal(rows.length, 1)
  }
})

test('l’ancienne création fonctionne sans durée et les estimations invalides sont refusées', async () => {
  const { publish } = fixture()
  const normal = { ...locations, departure_at: future, seats_total: 1, price_per_seat_eur: 0 }
  const response = await publish(normal)
  assert.equal(response.status, 201)
  assert.equal((await response.json()).carpool.estimated_duration_min, null)
  for (const duration of [0, -1, 2.5, '10', 2147483648]) {
    assert.equal((await publish({ ...normal, estimated_duration_min: duration })).status, 400)
  }
  assert.equal((await publish({ ...repeat, departure_at: new Date(0).toISOString() })).status, 400)
})

const { upcomingDepartures, followingWeek } = moduleFor('src/lib/carpool-schedule.ts')

test('plusieurs dates triées, avec retours partiels et nouvelle publication indépendante', async () => {
  const { publish, rows } = fixture()
  const firstDate = future.slice(0, 10)
  const dates = upcomingDepartures([followingWeek(firstDate), firstDate], '12:00', 0)
  assert.equal(dates.length, 2)
  assert.notEqual(dates[0], dates[1])
  for (const departure_at of [dates[0], dates[0], dates[1]]) {
    const response = await publish({ ...repeat, departure_at })
    assert.ok(response.ok)
  }
  assert.equal(rows.length, 3)
  assert.throws(() => upcomingDepartures([firstDate, firstDate], '12:00', 0), /même date/)
  assert.throws(() => upcomingDepartures(['2030-02-31'], '08:30', 0), /indisponible/)
  assert.throws(() => upcomingDepartures([''], '08:30', 0), /date/)
  assert.equal(followingWeek('2028-12-27'), '2029-01-03')
})
