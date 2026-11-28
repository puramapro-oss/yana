import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { encode as geohashEncode, commonPrefixLength } from '@/lib/geohash'
import { findArrivalMatches, parseCarpoolInstant } from '@/lib/carpool-arrival'
import type { SearchableCarpool } from '@/lib/carpool-arrival'

export const runtime = 'nodejs'

// precision 4 geohash ≈ 40km — matching "même ville / même aire urbaine".
// On filtre DB par prefix puis on raffine en JS via commonPrefixLength.
const SEARCH_PREFIX_LEN = 3
const MIN_MATCH_PREFIX = 3 // ≈ 150km aire régionale — filtre JS tolérant

export async function GET(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fromLat = parseFloatOrNull(searchParams.get('from_lat'))
  const fromLng = parseFloatOrNull(searchParams.get('from_lng'))
  const toLat = parseFloatOrNull(searchParams.get('to_lat'))
  const toLng = parseFloatOrNull(searchParams.get('to_lng'))
  const fromAt = searchParams.get('from_at')
  const toAt = searchParams.get('to_at')
  const womenOnly = searchParams.get('women_only') === '1'

  const deadlineText = searchParams.get('arrive_by')
  const deadline = deadlineText == null ? null : parseCarpoolInstant(deadlineText)
  const afterText = searchParams.get('departure_after')
  const after = afterText == null ? null : parseCarpoolInstant(afterText)
  const fromCity = searchParams.get('from')?.trim()
  const toCity = searchParams.get('to')?.trim()
  const excludeId = searchParams.get('exclude_id')
  const minSeats = searchParams.get('min_seats') ?? '1'
  if ((deadlineText != null && deadline == null) || (afterText != null && after == null)) {
    return NextResponse.json({ error: 'Indique une date et une heure avec fuseau horaire.' }, { status: 400 })
  }
  if ((fromCity?.length ?? 0) > 100 || (toCity?.length ?? 0) > 100 || !/^[1-7]$/.test(minSeats)
    || (excludeId != null && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(excludeId))) {
    return NextResponse.json({ error: 'Les critères du trajet sont invalides.' }, { status: 400 })
  }

  const admin = createServiceClient()
  let query = admin
    .from('carpools')
    .select('id, driver_id, vehicle_id, from_city, to_city, from_geohash, to_geohash, departure_at, estimated_duration_min, seats_total, seats_remaining, price_per_seat_cents, prime_per_seat_cents, description, status, requires_kyc, women_only, silent_ride, pets_allowed, created_at, updated_at')
    .eq('status', 'open')
    .gte('seats_remaining', Number(minSeats))
    .order('departure_at', { ascending: true })
    .order('id', { ascending: true })

  if (after != null) {
    query = query.gte('departure_at', new Date(Math.max(Date.now(), after)).toISOString())
    if (fromAt) query = query.gt('departure_at', fromAt)
  } else {
    query = query.gt('departure_at', fromAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString())
  }
  if (fromCity) query = fromCity.includes('*') ? query.eq('from_city', fromCity) : query.ilike('from_city', escapeCity(fromCity))
  if (toCity) query = toCity.includes('*') ? query.eq('to_city', toCity) : query.ilike('to_city', escapeCity(toCity))
  if (excludeId) query = query.neq('id', excludeId)
  if (deadline != null) {
    query = query.lt('departure_at', new Date(deadline).toISOString()).gt('estimated_duration_min', 0)
  }

  if (toAt) query = query.lt('departure_at', toAt)
  if (womenOnly) query = query.eq('women_only', true)
  if (searchParams.get('silent_ride') === '1') query = query.eq('silent_ride', true)
  if (searchParams.get('pets_allowed') === '1') query = query.eq('pets_allowed', true)

  // Prefix filter SQL-side (si coords fournies)
  if (fromLat != null && fromLng != null) {
    const prefix = geohashEncode(fromLat, fromLng, SEARCH_PREFIX_LEN)
    query = query.like('from_geohash', `${prefix}%`)
  }
  if (toLat != null && toLng != null) {
    const prefix = geohashEncode(toLat, toLng, SEARCH_PREFIX_LEN)
    query = query.like('to_geohash', `${prefix}%`)
  }

  // Exclure ses propres trajets
  query = query.neq('driver_id', user.id)

  async function loadPage(offset: number, size: number): Promise<SearchableCarpool[]> {
    const { data, error } = await query.range(offset, offset + size - 1)
    if (error) throw error
    return (data ?? []) as SearchableCarpool[]
  }

  let carpools: SearchableCarpool[]
  try {
    carpools = deadline == null ? await loadPage(0, 100) : await findArrivalMatches(deadline, loadPage)
  } catch {
    return NextResponse.json(
      { error: 'Recherche impossible. Réessaie.' },
      { status: 500 },
    )
  }

  // Raffinement JS (prefix len minimum réel)
  if (fromLat != null && fromLng != null) {
    const ref = geohashEncode(fromLat, fromLng, 6)
    carpools = carpools.filter(
      (c) => commonPrefixLength(c.from_geohash, ref) >= MIN_MATCH_PREFIX,
    )
  }
  if (toLat != null && toLng != null) {
    const ref = geohashEncode(toLat, toLng, 6)
    carpools = carpools.filter(
      (c) => commonPrefixLength(c.to_geohash, ref) >= MIN_MATCH_PREFIX,
    )
  }

  return NextResponse.json({ carpools, count: carpools.length })
}

function parseFloatOrNull(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// PostgREST also accepts * as a wildcard. Cities containing one use eq above.
function escapeCity(city: string): string {
  return city.replace(/[\\_%]/g, '\\\\$&')
}
