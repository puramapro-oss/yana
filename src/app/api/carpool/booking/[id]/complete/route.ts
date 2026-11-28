import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { bookingError } from '@/lib/carpool-booking-error'

export const runtime = 'nodejs'

const IdSchema = z.string().uuid({ message: 'Réservation invalide.' })

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { data, error } = await createServiceClient().rpc('confirm_carpool_arrival', {
    p_booking: parsedId.data,
    p_actor: user.id,
  })
  if (error || !data?.ok) return bookingError(error?.message ?? '')
  return NextResponse.json(data)
}
