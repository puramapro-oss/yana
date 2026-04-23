import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { encode as geohashEncode } from '@/lib/geohash'

export const runtime = 'nodejs'

const BodySchema = z.object({
  from_city: z.string().trim().min(2).max(100),
  to_city: z.string().trim().min(2).max(100),
  from_lat: z.number().min(-90).max(90),
  from_lng: z.number().min(-180).max(180),
  to_lat: z.number().min(-90).max(90),
  to_lng: z.number().min(-180).max(180),
  departure_at: z.string().datetime({ message: 'Date de départ invalide.' }),
  seats_total: z.number().int().min(1).max(7),
  price_per_seat_eur: z.number().min(0).max(500),
  description: z.string().max(500).nullable().optional(),
  women_only: z.boolean().optional(),
  silent_ride: z.boolean().optional(),
  pets_allowed: z.boolean().optional(),
})

interface ProfileLite {
  id: string
  onfido_status: 'pending' | 'approved' | 'rejected' | 'expired' | null
  role: string
}

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

  const fromGeohash = geohashEncode(parsed.data.from_lat, parsed.data.from_lng, 6)
  const toGeohash = geohashEncode(parsed.data.to_lat, parsed.data.to_lng, 6)
  const price = Math.round(parsed.data.price_per_seat_eur * 100)

  const { data, error } = await admin
    .from('carpools')
    .insert({
      driver_id: profile.id,
      from_city: parsed.data.from_city,
      to_city: parsed.data.to_city,
      from_geohash: fromGeohash,
      to_geohash: toGeohash,
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

  if (error || !data) {
    return NextResponse.json(
      { error: 'Création impossible. Réessaie dans quelques secondes.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ carpool: data }, { status: 201 })
}
