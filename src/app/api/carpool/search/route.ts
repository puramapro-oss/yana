import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { encode as geohashEncode, commonPrefixLength } from '@/lib/geohash'
import type { Carpool } from '@/types'

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

  const admin = createServiceClient()
  let query = admin
    .from('carpools')
    .select('*')
    .eq('status', 'open')
    .gt('seats_remaining', 0)
    .gt('departure_at', fromAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString())
    .order('departure_at', { ascending: true })
    .limit(100)

  if (toAt) query = query.lt('departure_at', toAt)
  if (womenOnly) query = query.eq('women_only', true)

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

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: 'Recherche impossible. Réessaie.' },
      { status: 500 },
    )
  }

  let carpools = (data ?? []) as Carpool[]

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
