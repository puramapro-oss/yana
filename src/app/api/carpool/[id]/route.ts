import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const IdSchema = z.string().uuid({ message: 'Trajet invalide.' })

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { id } = await ctx.params
  const parsed = IdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]!.message }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: carpool, error } = await admin
    .from('carpools')
    .select('*')
    .eq('id', parsed.data)
    .maybeSingle()

  if (error || !carpool) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }

  // Infos driver — anonymisées sauf si l'user est déjà passager confirmé
  const { data: driver } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, trust_score, sanskrit_level, onfido_status')
    .eq('id', carpool.driver_id)
    .maybeSingle()

  // Récupère mon booking existant s'il y en a un
  const { data: myBooking } = await admin
    .from('carpool_bookings')
    .select('*')
    .eq('carpool_id', carpool.id)
    .eq('passenger_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    carpool,
    driver: driver
      ? {
          id: driver.id,
          full_name: driver.full_name ?? 'Conducteur YANA',
          avatar_url: driver.avatar_url,
          trust_score: driver.trust_score,
          sanskrit_level: driver.sanskrit_level,
          kyc_approved: driver.onfido_status === 'approved',
        }
      : null,
    my_booking: myBooking ?? null,
    is_driver: carpool.driver_id === user.id,
  })
}
