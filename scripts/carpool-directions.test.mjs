import assert from 'node:assert/strict'
import test from 'node:test'
import { carpoolMapLinks } from '../src/lib/carpool-directions.ts'

const trip = {
  from_city: 'Bouverans', to_city: 'Frasne', meeting_point_label: 'Parking A&B',
  status: 'open',
}

test('cible renseignée et protégée, mode choisi à l’ouverture des cartes', () => {
  for (const [booking, driver] of [['confirmed', false], ['in_progress', false], [undefined, true]]) {
    const href = new URL(carpoolMapLinks(trip, booking, driver).meetingDirections)
    assert.equal(href.host, 'www.google.com')
    assert.equal(href.pathname, '/maps/dir/')
    assert.deepEqual(Object.fromEntries(href.searchParams), { api: '1', destination: 'Parking A&B, Bouverans' })
  }
})

test('ville seule pour un visiteur, une réservation inactive ou un point absent', () => {
  for (const status of [undefined, 'pending', 'cancelled', 'disputed', 'completed']) {
    const links = carpoolMapLinks(trip, status, false)
    assert.equal(links.meetingDirections, null)
    assert.deepEqual(Object.fromEntries(new URL(links.destinationCity).searchParams), { api: '1', query: 'Frasne' })
  }
  assert.equal(carpoolMapLinks({ ...trip, status: 'cancelled' }, 'confirmed', false).meetingDirections, null)
  assert.equal(carpoolMapLinks({ ...trip, meeting_point_label: null }, 'confirmed', false).meetingDirections, null)
})
