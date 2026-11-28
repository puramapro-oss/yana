import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import { TripObservations, TripUploads } from '../mobile/src/lib/trip-observations.ts'

const fix = (timestamp, speed, latitude = 47, accuracy = 5) => ({
  timestamp, coords: { speed, accuracy, latitude, longitude: 6 },
})
const min = 60_000

test('missing, invalid and stale speed are unknown; a valid zero is displayed', () => {
  const obs = new TripObservations(0)
  assert.equal(obs.snapshot(1).current_speed_kmh, null)
  for (const [index, value] of [null, -1, NaN, Infinity, 500].entries()) {
    obs.accept(fix(index * 1000, value), index * 1000)
    assert.equal(obs.snapshot(index * 1000).current_speed_kmh, null)
  }
  obs.accept(fix(5000, 0), 5000)
  assert.equal(obs.snapshot(5000).current_speed_kmh, 0)
  assert.equal(obs.snapshot(20_001).current_speed_kmh, null)
  assert.deepEqual(obs.snapshot(20_001).coverage, { accepted_fixes: 1, observed_seconds: 0 })
})

test('only distinct recent ordered fixes yield observed time; gaps, poor accuracy and pause break continuity', () => {
  const obs = new TripObservations(0)
  const add = (t, speed = 12, lat = 47, acc = 5) => obs.accept(fix(t, speed, lat, acc), t)
  add(1000); add(2000); add(2000); obs.accept(fix(1200, 12), 2100)
  add(4000, 12, 47, 80); add(6000); add(8000); add(24_000)
  add(25_000, null); add(26_000); add(27_000)
  obs.pause(28_000); add(29_000); obs.resume(30_000); obs.accept(fix(29_999, 12), 30_001)
  add(31_000, 12, 48); add(32_000, 12, 48)
  assert.deepEqual(obs.snapshot(32_000).coverage, { accepted_fixes: 9, observed_seconds: 5 })
  assert.equal(obs.snapshot(32_000).distance_m, 0)
  assert.equal(obs.snapshot(32_000).duration_sec, 30)
})

test('future, expired fixes and impossible coordinate jumps add no distance or observed time', () => {
  const obs = new TripObservations(1000)
  assert.equal(obs.accept(fix(0, 5), 1000), null)
  assert.equal(obs.accept(fix(3000, 5), 2000), null)
  assert.equal(obs.accept(fix(2000, 5), 18_000), null)
  obs.accept(fix(20_000, 5), 20_000); obs.accept(fix(21_000, 5, 48), 21_000)
  assert.equal(obs.snapshot(21_000).distance_m, 0)
  assert.equal(obs.snapshot(21_000).coverage.observed_seconds, 0)
})

test('receipt distance excludes displacement during an interval without usable speed', () => {
  const obs = new TripObservations(0)
  for (const [t, s, lat] of [[0, 10, 47], [1000, 10, 47.00009], [2000, null, 47.00018], [3000, 10, 47.00027]]) {
    obs.accept(fix(t, s, lat), t)
  }
  assert.equal(obs.snapshot(3000).observed_distance_m, 10)
  assert.equal(obs.snapshot(3000).distance_m, 30)
})

test('early passive break reminder resets only after a sustained manual tracking pause', () => {
  const obs = new TripObservations(0)
  assert.equal(obs.snapshot(104 * min).break_reminder_due, false)
  assert.equal(obs.snapshot(105 * min).break_reminder_due, true)
  obs.pause(105 * min); obs.resume(106 * min)
  assert.equal(obs.snapshot(106 * min).break_reminder_due, true)
  obs.pause(107 * min)
  assert.equal(obs.snapshot(125 * min).break_reminder_due, false)
  obs.resume(125 * min)
  assert.equal(obs.snapshot(229 * min).break_reminder_due, false)
  assert.equal(obs.snapshot(230 * min).break_reminder_due, true)
})

test('receipts are coalesced, expire on failure and finish drains all event batches', async () => {
  const ticks = (s) => ({ distance_m: s * 10, observed_distance_m: s * 9, coverage: { accepted_fixes: s + 1, observed_seconds: s } })
  const receipts = []
  let queued = 3
  const uploads = new TripUploads(async (receipt) => {
    assert.equal(receipt.distance_m, receipt.observed_seconds * 9)
    receipts.push(receipt.observed_seconds)
    if (receipts.length === 1) throw new Error('offline')
  }, async () => { queued--; return true }, () => queued)
  uploads.observe(ticks(59)); uploads.observe(ticks(60)); uploads.observe(ticks(60))
  await new Promise((done) => setImmediate(done))
  uploads.observe(ticks(80))
  assert.equal(await uploads.finish(ticks(120)), true)
  assert.deepEqual(receipts, [60, 120]); assert.equal(queued, 0)
  uploads.observe(ticks(180)); assert.deepEqual(receipts, [60, 120])
})

test('an incomplete event journal does not release coverage on finalisation', async () => {
  let done
  const uploads = new TripUploads(async () => {}, () => new Promise((resolve) => { done = resolve }), () => 1)
  const active = uploads.flush()
  assert.equal(active, uploads.flush())
  const closed = uploads.finish({ distance_m: 0, observed_distance_m: 0, coverage: { accepted_fixes: 0, observed_seconds: 0 } })
  done(false)
  assert.equal(await closed, false)
})

// Run both production adapters with deterministic location providers.
const sim = {}
globalThis.yanaTripTest = sim
const mocks = {
  'expo-location': `export const Accuracy={BestForNavigation:1,High:1};
    export async function watchPositionAsync(_, cb){globalThis.yanaTripTest.foreground=cb;return {remove(){}}}
    export async function startLocationUpdatesAsync(){}; export async function stopLocationUpdatesAsync(){}`,
  'expo-task-manager': `export function defineTask(_, f){globalThis.yanaTripTest.background=f}
    export async function isTaskRegisteredAsync(){return false}`,
  'react-native': "export const Platform={OS:'android'}",
  './constants': "export const BACKGROUND_LOCATION_TASK='test'",
  './event-queue': 'export function enqueueEvent(){}',
  './sensor-buffer': 'export class SensorBuffer{async start(){return false}stop(){}}',
}
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/trip-tracker.ts') && Object.hasOwn(mocks, specifier)) {
    return { url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier]), shortCircuit: true }
  }
  if (specifier.endsWith('/trip-observations')) return next(specifier + '.ts', context)
  return next(specifier, context)
} })
const { TripTracker } = await import('../src/lib/tracking.ts')
const { TripTrackerRN } = await import('../mobile/src/lib/trip-tracker.ts')

for (const mobile of [false, true]) {
  test((mobile ? 'Expo' : 'web') + ' tracker does not infer speeding or acceleration from missing speed', async (t) => {
    let clock = 1_000_000
    t.mock.method(Date, 'now', () => clock)
    if (!mobile) {
      t.mock.getter(globalThis, 'navigator', () => ({ geolocation: {
        watchPosition(cb) { sim.foreground = cb; return 1 }, clearWatch() {},
      } }))
    }
    const events = []
    const tracker = mobile ? new TripTrackerRN() : new TripTracker()
    await tracker.start({ onEvent: (e) => events.push(e) }, true)
    try {
      const add = (s) => {
        clock += 1000
        const position = fix(clock, s)
        sim.foreground(position)
        if (mobile) sim.background({ data: { locations: [position] } })
      }
      add(40); add(40); add(null); add(40); add(40)
      assert.deepEqual(events, [])
      add(35)
      assert.equal(events.length, 1); assert.equal(events[0].event_type, 'harsh_brake')
      assert.equal(events[0].speed_limit_kmh, null)
      tracker.pause(); add(0)
      const tick = await tracker.stop()
      assert.equal(tick.coverage.accepted_fixes, 5)
      assert.equal(tick.coverage.observed_seconds, 3)
      assert.equal(tick.max_speed_kmh, 144)
    } finally {
      await tracker.stop()
    }
  })
}
