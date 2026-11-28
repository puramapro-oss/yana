import { NextResponse } from 'next/server'

const errors: Record<string, [number, string]> = {
  ride_missing: [404, 'Trajet introuvable.'],
  booking_missing: [404, 'Réservation introuvable.'],
  identity_required: [403, 'Vérifie ton identité avant de réserver.'],
  own_ride: [400, 'Tu ne peux pas réserver ton propre trajet.'],
  restricted_ride: [403, 'Tu ne remplis pas les conditions de ce trajet.'],
  invalid_seats: [400, 'Nombre de places invalide.'],
  already_booked: [409, 'Une réservation existe déjà pour ce trajet.'],
  ride_unavailable: [409, 'Le trajet ou le nombre de places demandé est indisponible.'],
  party_required: [403, 'Confirmation réservée aux participants du trajet.'],
  invalid_state: [409, 'Cette réservation ne peut plus être confirmée.'],
  not_departed: [409, 'Confirme ton arrivée après le trajet.'],
}

export function bookingError(code: string) {
  const [status, error] = Object.hasOwn(errors, code)
    ? errors[code]
    : [503, 'Le service de réservation est momentanément indisponible.']
  return NextResponse.json(
    { error, ...(code === 'identity_required' && { kyc_required: true }) },
    { status },
  )
}
