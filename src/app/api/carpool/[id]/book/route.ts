import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const SafeWalkContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(30),
})

const BodySchema = z.object({
  seats: z.number().int().min(1).max(7).default(1),
  safe_walk_contacts: z.array(SafeWalkContactSchema).max(3).optional(),
})

const IdSchema = z.string().uuid({ message: 'Trajet invalide.' })

interface CarpoolRow {
  id: string
  driver_id: string
  seats_remaining: number
  price_per_seat_cents: number
  status: string
  requires_kyc: boolean
  women_only: boolean
}

interface ProfileLite {
  id: string
  role: string
  onfido_status: 'pending' | 'approved' | 'rejected' | 'expired' | null
  metadata: Record<string, unknown>
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { id } = await ctx.params
  const parsedId = IdSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json({ error: parsedId.error.issues[0]!.message }, { status: 400 })
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
    .select('id, role, onfido_status, metadata')
    .eq('id', user.id)
    .maybeSingle<ProfileLite>()

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  // KYC gate — super_admin bypass pour E2E tests (§KARMA-BRIEF §10)
  const kycApproved = profile.onfido_status === 'approved' || profile.role === 'super_admin'
  if (!kycApproved) {
    return NextResponse.json(
      {
        error:
          "Vérifie ton identité avant ta première réservation. 2 min chrono — on protège tout le monde.",
        kyc_required: true,
      },
      { status: 403 },
    )
  }

  const { data: carpool } = await admin
    .from('carpools')
    .select('id, driver_id, seats_remaining, price_per_seat_cents, status, requires_kyc, women_only')
    .eq('id', parsedId.data)
    .maybeSingle<CarpoolRow>()

  if (!carpool) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }
  if (carpool.driver_id === profile.id) {
    return NextResponse.json(
      { error: 'Tu ne peux pas réserver ton propre trajet.' },
      { status: 400 },
    )
  }
  if (carpool.status !== 'open') {
    return NextResponse.json({ error: 'Ce trajet n’est plus disponible.' }, { status: 409 })
  }
  if (carpool.seats_remaining < parsed.data.seats) {
    return NextResponse.json(
      { error: `Il ne reste que ${carpool.seats_remaining} place(s) sur ce trajet.` },
      { status: 409 },
    )
  }

  if (carpool.women_only) {
    const gender = (profile.metadata?.gender as string | undefined) ?? null
    if (gender !== 'female') {
      return NextResponse.json(
        { error: 'Ce trajet est réservé aux femmes.' },
        { status: 403 },
      )
    }
  }

  const totalPriceCents = carpool.price_per_seat_cents * parsed.data.seats

  // Insert booking (status=confirmed directement en MVP — Stripe payment P3).
  // Note : en P3 on basculera sur status='pending' avec capture Stripe → confirmed via webhook.
  const { data: booking, error } = await admin
    .from('carpool_bookings')
    .insert({
      carpool_id: carpool.id,
      passenger_id: profile.id,
      seats: parsed.data.seats,
      total_price_cents: totalPriceCents,
      total_prime_cents: 0,
      status: 'confirmed',
      safe_walk_contacts: parsed.data.safe_walk_contacts ?? [],
    })
    .select('*')
    .single()

  if (error || !booking) {
    // 23505 = unique_violation (unique(carpool_id, passenger_id))
    const code = (error as { code?: string } | null)?.code
    if (code === '23505') {
      return NextResponse.json({ error: 'Tu as déjà réservé ce trajet.' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Réservation impossible. Réessaie.' },
      { status: 500 },
    )
  }

  // Décrémenter places restantes (passer en 'full' si 0)
  const newRemaining = carpool.seats_remaining - parsed.data.seats
  await admin
    .from('carpools')
    .update({
      seats_remaining: newRemaining,
      status: newRemaining <= 0 ? 'full' : carpool.status,
    })
    .eq('id', carpool.id)

  return NextResponse.json({ booking }, { status: 201 })
}
