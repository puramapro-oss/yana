import type { Carpool } from '@/types'

type FallbackTrip = Pick<Carpool, 'id' | 'from_city' | 'to_city' | 'departure_at'>

export function fallbackSearchHref(trip: FallbackTrip, seats = 1): string {
  const params = new URLSearchParams({
    from: trip.from_city,
    to: trip.to_city,
    exclude_id: trip.id,
    min_seats: String(seats),
  })
  const departure = Date.parse(trip.departure_at)
  if (Number.isFinite(departure)) {
    params.set('departure_after', new Date(departure).toISOString())
  }
  return `/carpool?${params.toString()}`
}

// Communes desservies indiquées par la Communauté de communes du Plateau de Frasne.
const PLATEAU_STOPS = new Set([
  'bonnevaux', 'bouverans', 'dompierre-les-tilleuls', 'frasne',
  'la-rivière-drugeon', 'vaux-et-chantegrue',
])

export function isFrasneConnection(fromCity: string, toCity: string): boolean {
  const from = fromCity.trim().normalize('NFC').toLowerCase()
  const to = toCity.trim().normalize('NFC').toLowerCase()
  return from !== to && (from === 'frasne' || to === 'frasne')
    && PLATEAU_STOPS.has(from) && PLATEAU_STOPS.has(to)
}
