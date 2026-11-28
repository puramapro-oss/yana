import assert from 'node:assert/strict'
import test from 'node:test'
import { fallbackSearchHref, isFrasneConnection } from '../src/lib/carpool-fallback.ts'

const trip = {
  id: '9d54fe14-6f77-4067-8e57-7701ad443ba9',
  from_city: 'Vaux & Arrêts',
  to_city: 'Frasne',
  departure_at: '2026-12-01T08:00:00+01:00',
}

test('recherche interne avec villes intactes, heure absolue, places et exclusion', () => {
  const url = new URL(fallbackSearchHref(trip, 3), 'https://yana.example')
  assert.equal(url.pathname, '/carpool')
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    from: trip.from_city, to: trip.to_city, exclude_id: trip.id,
    min_seats: '3', departure_after: '2026-12-01T07:00:00.000Z',
  })
})

test('réservation inconnue ou date historique invalide', () => {
  const url = new URL(fallbackSearchHref({ ...trip, departure_at: '' }), 'https://yana.example')
  assert.equal(url.searchParams.get('min_seats'), '1')
  assert.equal(url.searchParams.has('departure_after'), false)
})

test('affiche le planificateur du corridor Frasne dans les deux sens', () => {
  assert.equal(isFrasneConnection(' BOUVERANS ', 'Frasne'), true)
  assert.equal(isFrasneConnection('frasne', 'La-Rivière-Drugeon'.normalize('NFD')), true)
  assert.equal(isFrasneConnection('Frasne', 'Frasne'), false)
  assert.equal(isFrasneConnection('Frasne-les-Meulières', 'Bonnevaux'), false)
  assert.equal(isFrasneConnection('Frasne', 'Berlin'), false)
})
