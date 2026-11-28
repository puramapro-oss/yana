import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import type { CoverageReceipt } from '@/lib/trip-coverage'
import { calculateTripScore } from '@/lib/scoring'
import { encode as geohashEncode } from '@/lib/geohash'
import { PLANS } from '@/lib/constants'
import type { FuelType, Plan, TripEventType, TripMode } from '@/types'

export const runtime = 'nodejs'

const BodySchema = z.object({
  trip_id: z.string().uuid({ message: 'Trajet invalide.' }),
  distance_km: z.number().min(0).max(2000).optional(),
  duration_sec: z.number().int().min(0).max(86_400).optional(),
  max_speed_kmh: z.number().min(0).max(400).nullable().optional(),
  coverage: z.object({
    accepted_fixes: z.number().int().min(0).max(2_000_000),
    observed_seconds: z.number().int().min(0).max(86_400),
  }).optional(),
  end_lat: z.number().min(-90).max(90).nullable().optional(),
  end_lng: z.number().min(-180).max(180).nullable().optional(),
  cancel: z.boolean().optional(),
})

interface TripRow {
  id: string
  user_id: string
  vehicle_id: string | null
  trip_mode: TripMode
  status: string
  passengers_count: number
  started_at: string
}

interface VehicleRow {
  fuel_type: FuelType | null
}

interface TripEventRow {
  event_type: TripEventType
  severity: number
  speed_kmh: number | null
  speed_limit_kmh: number | null
}

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()

  // 1. Récupérer trip + vérifier ownership + status
  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('id, user_id, vehicle_id, trip_mode, status, passengers_count, started_at')
    .eq('id', parsed.data.trip_id)
    .maybeSingle<TripRow>()

  if (tripError) return NextResponse.json({ error: 'Trajet indisponible.' }, { status: 503 })
  if (!trip) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }
  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  if (trip.status !== 'in_progress') {
    if (trip.status === 'completed' && !parsed.data.cancel) {
      const saved = await admin.from('trip_finalizations').select('result').eq('trip_id', trip.id).maybeSingle()
      if (saved.error) return NextResponse.json({ error: 'Bilan indisponible.' }, { status: 503 })
      if (saved.data) return NextResponse.json(saved.data.result)
    }
    if (trip.status === 'cancelled' && parsed.data.cancel) return NextResponse.json({ cancelled: true })
    return NextResponse.json({ error: 'Ce trajet est déjà clôturé.' }, { status: 409 })
  }

  if (parsed.data.cancel) {
    const saved = await admin.from('trips').update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', trip.id).eq('status', 'in_progress').select('id').maybeSingle()
    if (saved.error) return NextResponse.json({ error: 'Annulation indisponible.' }, { status: 503 })
    if (!saved.data) return NextResponse.json({ error: 'Ce trajet est déjà clôturé.' }, { status: 409 })
    return NextResponse.json({ cancelled: true })
  }

  const distanceKm = parsed.data.distance_km ?? 0
  const durationSec = parsed.data.duration_sec ?? 0

  // 3. Charger fuel_type depuis vehicle + events du trip
  let fuelType: FuelType | null = null
  if (trip.vehicle_id) {
    const { data: vehicle } = await admin
      .from('vehicles')
      .select('fuel_type')
      .eq('id', trip.vehicle_id)
      .maybeSingle<VehicleRow>()
    fuelType = vehicle?.fuel_type ?? null
  }

  const events: TripEventRow[] = []
  for (let offset = 0; ; offset += 500) {
    const batch = await admin.from('trip_events').select('id, event_type, severity, speed_kmh, speed_limit_kmh')
      .eq('trip_id', trip.id).order('id').range(offset, offset + 499)
    if (batch.error) return NextResponse.json({ error: 'Journal du trajet indisponible.' }, { status: 503 })
    events.push(...(batch.data ?? []) as TripEventRow[])
    if ((batch.data?.length ?? 0) < 500) break
  }

  const receipts: CoverageReceipt[] = []
  if (parsed.data.coverage) {
    // Jusqu'à 24 h de trajet et un reçu par minute. Respecter la pagination PostgREST.
    for (let offset = 0; ; offset += 500) {
      const batch = await admin.from('trip_coverage_receipts')
        .select('received_at, accepted_fixes, observed_seconds, distance_m')
        .eq('trip_id', trip.id).order('minute_bucket').range(offset, offset + 499)
      if (batch.error) return NextResponse.json({ error: 'Reçus du trajet indisponibles.' }, { status: 503 })
      receipts.push(...(batch.data ?? []) as CoverageReceipt[])
      if ((batch.data?.length ?? 0) < 500) break
    }
  }

  const score = calculateTripScore({
    events, receipts, coverage: parsed.data.coverage, distance_km: distanceKm, duration_sec: durationSec,
    elapsed_sec: (Date.now() - Date.parse(trip.started_at)) / 1000,
    fuel_type: fuelType, trip_mode: trip.trip_mode, passengers_count: trip.passengers_count,
  })

  const { data: profile, error: profileError } = await admin.from('profiles').select('plan, role')
    .eq('id', user.id).maybeSingle()
  if (profileError || !profile) return NextResponse.json({ error: 'Profil indisponible.' }, { status: 503 })

  const effectivePlan: Plan = profile.role === 'super_admin' ? 'legende' : (profile.plan as Plan)
  const multiplier = PLANS[effectivePlan].multiplier
  const xpGained = score.safety_score !== null && score.reward_distance_km >= 1
    ? Math.floor(score.safety_score / 10 + score.reward_distance_km) : 0
  const endGeohash = parsed.data.end_lat != null && parsed.data.end_lng != null
    ? geohashEncode(parsed.data.end_lat, parsed.data.end_lng) : null

  const result = {
    score: {
      ...score,
      // Les anciennes applications mobiles affichent directement medal.toUpperCase().
      medal: score.badge ?? 'indisponible',
      events_summary: score.event_counts,
      seeds_earned: score.seeds_earned * multiplier,
    },
    trip_id: trip.id, distance_km: distanceKm, duration_sec: durationSec,
    plan_multiplier: multiplier, xp_gained: xpGained,
  }
  const saved = await admin.rpc('finalize_observed_trip', {
    p_user_id: user.id, p_trip_id: trip.id, p_result: result,
    p_max_speed: parsed.data.max_speed_kmh ?? null, p_end_geohash: endGeohash,
  })
  if (saved.error) return NextResponse.json({ error: 'Bilan non enregistré. Réessaie.' }, { status: 503 })
  if (!saved.data) return NextResponse.json({ error: 'Ce trajet est déjà clôturé.' }, { status: 409 })
  return NextResponse.json(saved.data)
}
