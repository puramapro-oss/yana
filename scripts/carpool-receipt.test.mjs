import assert from 'node:assert/strict'
import test from 'node:test'
import { carpoolReceipt } from '../src/lib/carpool-receipt.ts'

const booking = {
  status: 'completed', payout_driver_cents: 13, payout_platform_cents: 2,
  payout_eco_pool_cents: 1, payout_passenger_cents: 1,
}

test('devis identique au partage de production, frais inclus au centime', () => {
  const { kind, amounts } = carpoolReceipt(303)
  assert.equal(kind, 'estimate')
  assert.equal(amounts.payout_driver_cents, 242)
  assert.equal(amounts.payout_eco_pool_cents, 15)
  assert.equal(amounts.payout_platform_cents, 46)
})

test('le reçu historique conserve les valeurs enregistrées même si le barème change', () => {
  assert.deepEqual(carpoolReceipt(17, booking, 'historical'), { kind: 'recorded', amounts: booking })
})

test('aucune projection de versement sur annulation, litige ou financement en attente', () => {
  for (const status of ['cancelled', 'disputed']) {
    assert.equal(carpoolReceipt(17, { ...booking, status }).amounts, null)
  }
  assert.equal(carpoolReceipt(17, booking, 'historical', true).kind, 'inactive')
  assert.equal(carpoolReceipt(17, booking, 'awaiting_funding').kind, 'awaiting_funding')
})

test('versements historiques incomplets ou invalides détectés', () => {
  assert.equal(carpoolReceipt(18, booking).kind, 'unverified')
  assert.equal(carpoolReceipt(17, { ...booking, payout_driver_cents: undefined }).kind, 'unverified')
  assert.equal(carpoolReceipt(17, { ...booking, payout_driver_cents: -1, payout_platform_cents: 16 }).kind, 'unverified')
})

test('un trajet gratuit peut être clôturé avec zéro euro enregistré', () => {
  const free = { ...booking, payout_driver_cents: 0, payout_platform_cents: 0, payout_eco_pool_cents: 0, payout_passenger_cents: 0 }
  assert.equal(carpoolReceipt(0, free, 'free').kind, 'recorded')
})
