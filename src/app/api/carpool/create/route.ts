import { z } from 'zod'
import { findRepeatSource, repeatedDepartureId } from '@/lib/carpool-repeat'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { encode as geohashEncode } from '@/lib/geohash'

export const runtime = 'nodejs'

const LocationsSchema = z.object({
  from_city: z.string().trim().min(2).max(100),
  to_city: z.string().trim().min(2).max(100),
  from_lat: z.number().min(-90).max(90),
  from_lng: z.number().min(-180).max(180),
  to_lat: z.number().min(-90).max(90),
  to_lng: z.number().min(-180).max(180),
})

const OptionsSchema = z.object({
  estimated_duration_min: z.number().int().positive().max(2147483647).nullable().optional(),
  departure_at: z.string().datetime({ message: 'Date de départ invalide.' }),
  seats_total: z.number().int().min(1).max(7),
  price_per_seat_eur: z.number().min(0).max(500),
  description: z.string().max(500).nullable().optional(),
  women_only: z.boolean().optional(),
  silent_ride: z.boolean().optional(),
  pets_allowed: z.boolean().optional(),
})

const RepeatSchema = OptionsSchema.extend({ repeat_from_id: z.uuid() }).strict()
const NewSchema = OptionsSchema.extend(LocationsSchema.shape)

interface ProfileLite {
  id: string
  onfido_status: 'pending' | 'approved' | 'rejected' | 'expired' | null
  role: string
}

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const schema = json && typeof json === 'object' && 'repeat_from_id' in json ? RepeatSchema : NewSchema
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, onfido_status, role')
    .eq('id', user.id)
    .maybeSingle<ProfileLite>()

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  // Conducteur : KYC obligatoire (sécurité des passagers). Super admin OK.
  const kycOk = profile.onfido_status === 'approved' || profile.role === 'super_admin'
  if (!kycOk) {
    return NextResponse.json(
      {
        error:
          "Vérifie ton identité avant de proposer un covoiturage (sécurité des passagers).",
        kyc_required: true,
      },
      { status: 403 },
    )
  }

  const departureAt = new Date(parsed.data.departure_at)
  if (departureAt.getTime() < Date.now() + 30 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Le départ doit être dans au moins 30 minutes.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  let repeatId: string | undefined
  let route
  if ('repeat_from_id' in input) {
    const { data: source, error } = await findRepeatSource(admin, user.id, input.repeat_from_id)
    if (error) return NextResponse.json({ error: 'Lecture du trajet impossible.' }, { status: 503 })
    if (!source) return NextResponse.json({ error: 'Trajet à replanifier indisponible.' }, { status: 404 })
    repeatId = repeatedDepartureId(user.id, source.id, departureAt)
    route = {
      id: repeatId, from_city: source.from_city, to_city: source.to_city,
      from_geohash: source.from_geohash, to_geohash: source.to_geohash,
      meeting_point_label: source.meeting_point_label, meeting_point_geohash: source.meeting_point_geohash,
    }
  } else {
    route = {
      from_city: input.from_city, to_city: input.to_city,
      from_geohash: geohashEncode(input.from_lat, input.from_lng, 6),
      to_geohash: geohashEncode(input.to_lat, input.to_lng, 6),
    }
  }
  const price = Math.round(parsed.data.price_per_seat_eur * 100)

  const { data, error } = await admin
    .from('carpools')
    .insert({
      driver_id: profile.id,
      ...route,
      estimated_duration_min: input.estimated_duration_min ?? null,
      departure_at: parsed.data.departure_at,
      seats_total: parsed.data.seats_total,
      seats_remaining: parsed.data.seats_total,
      price_per_seat_cents: price,
      description: parsed.data.description ?? null,
      status: 'open',
      requires_kyc: true,
      women_only: parsed.data.women_only ?? false,
      silent_ride: parsed.data.silent_ride ?? false,
      pets_allowed: parsed.data.pets_allowed ?? false,
    })
    .select('*')
    .single()

  if (repeatId && error?.code === '23505') {
    const { data: existing } = await admin.from('carpools').select('*')
      .eq('id', repeatId).eq('driver_id', user.id).maybeSingle()
    if (existing) return NextResponse.json({ carpool: existing, already_published: true })
  }
  if (error || !data) {
    return NextResponse.json(
      { error: 'Création impossible. Réessaie dans quelques secondes.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ carpool: data }, { status: 201 })
}
