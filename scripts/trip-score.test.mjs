import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateTripScore } from '../src/lib/scoring.ts'

const coverage = { accepted_fixes: 181, observed_seconds: 180 }
const start = Date.parse('2026-11-28T08:00:00Z')
const receipts = [2, 61, 121, 180].map((s) => ({
  received_at: new Date(start + s * 1000).toISOString(),
  observed_seconds: s, accepted_fixes: s + 1, distance_m: s * 12,
}))
const run = (overrides) => calculateTripScore({
  coverage, receipts, events: [], distance_km: 2.16, duration_sec: 180, elapsed_sec: 184,
  fuel_type: 'electric', trip_mode: 'solo', passengers_count: 0, ...overrides,
})

test('ancienne application, journal vide, couverture interrompue ou durée impossible : bilan neutre', () => {
  for (const overrides of [
    { coverage: undefined }, { coverage: { accepted_fixes: 0, observed_seconds: 0 } },
    { coverage: { accepted_fixes: 121, observed_seconds: 120 } },
    { coverage: { accepted_fixes: 3, observed_seconds: 180 } },
    { elapsed_sec: 30 }, { distance_km: 350 }, { trip_mode: 'carpool_passenger' },
  ]) {
    const actual = run(overrides)
    assert.equal(actual.safety_score, null)
    assert.equal(actual.eco_score, null)
    assert.equal(actual.badge, null)
    assert.equal(actual.breakdown, null)
    assert.equal(actual.seeds_earned, 0)
  }
})

test('trajet observé hors ligne : indices indicatifs, aucun crédit de conduite', () => {
  const actual = run({ receipts: [] })
  assert.equal(actual.assessment, 'indicative')
  assert.equal(actual.safety_score, 100)
  assert.equal(actual.seeds_earned, 0)
  assert.equal(actual.reward_distance_km, 0)
})

test('crédit limité aux kilomètres entre les reçus cohérents, aucune prime passager déclarative', () => {
  const actual = run({})
  assert.equal(actual.reward_distance_km, 2.136)
  assert.equal(actual.seeds_earned, 1)
  assert.equal(run({ trip_mode: 'carpool_driver', passengers_count: 8 }).seeds_earned, 1)
})

test('aucun crédit après doublons, compteurs qui régressent, GPS incohérent ou interruption longue', () => {
  for (const candidates of [
    [receipts[0], receipts[0], receipts[3]],
    [receipts[0], receipts[3]],
    [receipts[1], receipts[0]],
    [receipts[0], { ...receipts[1], distance_m: 50_000 }],
    [receipts[0], { ...receipts[1], observed_seconds: 300 }],
  ]) assert.equal(run({ receipts: candidates }).reward_distance_km, 0)
})

test('limite historique 130, verrouillage du téléphone et freinage ne déclenchent aucune pénalité', () => {
  const events = ['speeding', 'phone_use', 'harsh_brake', 'fatigue_signal', 'break_missed']
    .map((event_type) => ({ event_type, severity: 4, speed_kmh: 145, speed_limit_kmh: 130 }))
  const actual = run({ events })
  assert.equal(actual.safety_score, 100)
  assert.equal(actual.event_counts.harsh_brake, 1)
  assert.equal(actual.eco_score, run({}).eco_score)
})
