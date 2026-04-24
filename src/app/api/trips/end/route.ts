import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { calculateTripScore } from '@/lib/scoring'
import { encode as geohashEncode } from '@/lib/geohash'
import { PLANS } from '@/lib/constants'
import type { FuelType, Plan, TripEventType, TripMode } from '@/types'

export const runtime = 'nodejs'

const BodySchema = z.object({
  trip_id: z.string().uuid({ message: 'Trajet invalide.' }),
  distance_km: z.number().min(0).max(2000).optional(),
  duration_sec: z.number().int().min(0).max(86_400).optional(),
  max_speed_kmh: z.number().min(0).max(400).optional(),
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
  const { data: trip } = await admin
    .from('trips')
    .select('id, user_id, vehicle_id, trip_mode, status, passengers_count')
    .eq('id', parsed.data.trip_id)
    .maybeSingle<TripRow>()

  if (!trip) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }
  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  if (trip.status !== 'in_progress') {
    return NextResponse.json({ error: 'Ce trajet est déjà clôturé.' }, { status: 409 })
  }

  // 2. Annulation simple → pas de scoring, pas de crédit
  if (parsed.data.cancel === true) {
    await admin
      .from('trips')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', trip.id)
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

  const { data: eventsRaw } = await admin
    .from('trip_events')
    .select('event_type, severity, speed_kmh, speed_limit_kmh')
    .eq('trip_id', trip.id)

  const events = (eventsRaw ?? []) as TripEventRow[]

  // 4. Scoring pure function
  const score = calculateTripScore({
    events,
    distance_km: distanceKm,
    duration_sec: durationSec,
    fuel_type: fuelType,
    trip_mode: trip.trip_mode,
    passengers_count: trip.passengers_count,
  })

  // 5. Récupérer plan user pour multiplier
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, plan, role, seeds_balance, total_trips, total_distance_km, co2_offset_total_kg, xp, level',
    )
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const effectivePlan: Plan = profile.role === 'super_admin' ? 'legende' : (profile.plan as Plan)
  const multiplier = PLANS[effectivePlan].multiplier
  const seedsFinal = score.seeds_earned * multiplier

  // XP gagné = score safety + bonus distance
  const xpGained = Math.floor(score.safety_score / 10 + distanceKm)

  // 6. Update trip complete
  const endGeohash =
    parsed.data.end_lat != null && parsed.data.end_lng != null
      ? geohashEncode(parsed.data.end_lat, parsed.data.end_lng)
      : null

  const avgSpeedKmh =
    durationSec > 0 && distanceKm > 0 ? (distanceKm / (durationSec / 3600)) : null

  await admin
    .from('trips')
    .update({
      ended_at: new Date().toISOString(),
      status: 'completed',
      distance_km: distanceKm,
      duration_sec: durationSec,
      max_speed_kmh: parsed.data.max_speed_kmh ?? null,
      avg_speed_kmh: avgSpeedKmh,
      safety_score: score.safety_score,
      eco_score: score.eco_score,
      co2_kg: score.co2_kg,
      seeds_earned: seedsFinal,
      points_earned: xpGained,
      end_geohash: endGeohash,
    })
    .eq('id', trip.id)

  // 7. Update profile aggregates (seeds + co2 + distance + xp + total_trips)
  await admin
    .from('profiles')
    .update({
      seeds_balance: (profile.seeds_balance ?? 0) + seedsFinal,
      total_trips: (profile.total_trips ?? 0) + 1,
      total_distance_km: Number(profile.total_distance_km ?? 0) + distanceKm,
      co2_offset_total_kg: Number(profile.co2_offset_total_kg ?? 0) + score.co2_kg,
      xp: (profile.xp ?? 0) + xpGained,
    })
    .eq('id', profile.id)

  // 8. Retour complet pour UI (animation score + confettis si gold)
  return NextResponse.json({
    score: {
      ...score,
      seeds_earned: seedsFinal,
    },
    trip_id: trip.id,
    distance_km: distanceKm,
    duration_sec: durationSec,
    plan_multiplier: multiplier,
    xp_gained: xpGained,
  })
}
