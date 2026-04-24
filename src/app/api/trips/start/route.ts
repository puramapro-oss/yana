import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { encode as geohashEncode } from '@/lib/geohash'

export const runtime = 'nodejs'

const BodySchema = z.object({
  vehicle_id: z.string().uuid({ message: 'Véhicule invalide.' }),
  trip_mode: z.enum(['solo', 'carpool_driver', 'carpool_passenger']).default('solo'),
  passengers_count: z.number().int().min(0).max(8).default(0),
  start_lat: z.number().min(-90).max(90).optional(),
  start_lng: z.number().min(-180).max(180).optional(),
})

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

  // 1. Vérifier ownership véhicule
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('id, user_id')
    .eq('id', parsed.data.vehicle_id)
    .maybeSingle()
  if (!vehicle) {
    return NextResponse.json({ error: 'Véhicule introuvable.' }, { status: 404 })
  }
  if (vehicle.user_id !== user.id) {
    return NextResponse.json({ error: 'Ce véhicule ne t’appartient pas.' }, { status: 403 })
  }

  // 2. Annuler automatiquement un trip "in_progress" zombie (<1h)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await admin
    .from('trips')
    .update({ status: 'cancelled', ended_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .lt('started_at', oneHourAgo)

  // 3. Si un trip in_progress récent existe, conflit (user doit le finir)
  const { data: active } = await admin
    .from('trips')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .limit(1)
  if (active && active.length > 0) {
    return NextResponse.json(
      { error: 'Un trajet est déjà en cours. Termine-le avant d’en démarrer un nouveau.' },
      { status: 409 },
    )
  }

  // 4. Créer le trip
  const startGeohash =
    parsed.data.start_lat != null && parsed.data.start_lng != null
      ? geohashEncode(parsed.data.start_lat, parsed.data.start_lng)
      : null

  const { data: trip, error } = await admin
    .from('trips')
    .insert({
      user_id: user.id,
      vehicle_id: parsed.data.vehicle_id,
      trip_mode: parsed.data.trip_mode,
      passengers_count: parsed.data.passengers_count,
      start_geohash: startGeohash,
      status: 'in_progress',
    })
    .select('id, started_at')
    .single()

  if (error || !trip) {
    return NextResponse.json(
      { error: 'Impossible de démarrer le trajet. Réessaie.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ trip_id: trip.id, started_at: trip.started_at })
}
