import assert from 'node:assert/strict'
import test from 'node:test'
import { estimatedArrival, findArrivalMatches, localDeadlineOptions, parseCarpoolInstant } from '../src/lib/carpool-arrival.ts'

test('La date limite doit désigner un instant réel avec fuseau explicite', () => {
  assert.equal(parseCarpoolInstant('2028-02-29T00:15+01:00'), Date.parse('2028-02-28T23:15Z'))
  for (const invalid of ['2027-02-29T11:00Z', '2028-01-01T10:00', '2028-06-31T12:15Z', '2028-01-01T24:00Z']) {
    assert.equal(parseCarpoolInstant(invalid), null)
  }
})

test('Minuit et changement d’heure sont calculés en temps écoulé', () => {
  const ride = { departure_at: '2027-03-28T01:45:00+01:00', estimated_duration_min: 45 }
  assert.equal(estimatedArrival(ride), Date.parse('2027-03-28T03:30:00+02:00'))
  assert.equal(estimatedArrival({ ...ride, departure_at: '2027-01-01T23:45Z' }), Date.parse('2027-01-02T00:30Z'))
  for (const duration of [null, 0, -5, 1.2]) {
    assert.equal(estimatedArrival({ ...ride, estimated_duration_min: duration }), null)
  }
})

test('Le téléphone distingue les deux heures d’automne et refuse le trou du printemps', () => {
  const original = process.env.TZ
  try {
    process.env.TZ = 'Europe/Paris'
    assert.deepEqual(localDeadlineOptions('2027-03-28T02:30'), [])
    assert.deepEqual(localDeadlineOptions('2027-10-31T02:30').map(d => d.toISOString()), [
      '2027-10-31T00:30:00.000Z', '2027-10-31T01:30:00.000Z',
    ])
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

test('Une arrivée à l’heure limite est admissible, y compris après la première page SQL', async () => {
  const departure_at = '2027-01-01T10:00Z'
  const rows = [90, 75, null, 30, 20, 15].map((estimated_duration_min, id) => ({ departure_at, estimated_duration_min, id }))
  const offsets = []
  const result = await findArrivalMatches(Date.parse('2027-01-01T10:30Z'), async (offset, size) => {
    offsets.push(offset)
    return rows.slice(offset, offset + size)
  }, 2)
  assert.deepEqual(offsets, [0, 2, 4])
  assert.deepEqual(result.map(r => r.id), [3, 4])
})
