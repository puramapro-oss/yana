import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const EventSchema = z.object({
  event_type: z.enum([
    'harsh_brake',
    'harsh_accel',
    'sharp_turn',
    'speeding',
    'phone_use',
    'fatigue_signal',
    'break_missed',
    'focus_maintained',
    'smooth_drive',
    'eco_acceleration',
  ]),
  severity: z.number().int().min(1).max(5),
  speed_kmh: z.number().min(0).max(400).nullable().optional(),
  speed_limit_kmh: z.number().min(0).max(200).nullable().optional(),
  g_force: z.number().min(-10).max(10).nullable().optional(),
  lat_rounded: z.number().min(-90).max(90).nullable().optional(),
  lng_rounded: z.number().min(-180).max(180).nullable().optional(),
  occurred_at: z.string().datetime().optional(),
})

const BodySchema = z.object({
  trip_id: z.string().uuid({ message: 'Trajet invalide.' }),
  events: z.array(EventSchema).min(1).max(200),
})

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient()
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

  // Vérifier ownership trip + status in_progress
  const { data: trip } = await admin
    .from('trips')
    .select('id, user_id, status')
    .eq('id', parsed.data.trip_id)
    .maybeSingle()
  if (!trip) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }
  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  if (trip.status !== 'in_progress') {
    return NextResponse.json(
      { error: 'Ce trajet est terminé. Impossible d’ajouter des événements.' },
      { status: 409 },
    )
  }

  // Insert batch
  const rows = parsed.data.events.map((e) => ({
    trip_id: parsed.data.trip_id,
    event_type: e.event_type,
    severity: e.severity,
    speed_kmh: e.speed_kmh ?? null,
    speed_limit_kmh: e.speed_limit_kmh ?? null,
    g_force: e.g_force ?? null,
    lat_rounded: e.lat_rounded ?? null,
    lng_rounded: e.lng_rounded ?? null,
    occurred_at: e.occurred_at ?? new Date().toISOString(),
  }))

  const { error } = await admin.from('trip_events').insert(rows)
  if (error) {
    return NextResponse.json(
      { error: 'Enregistrement événements échoué. Réessaie.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ inserted: rows.length })
}
