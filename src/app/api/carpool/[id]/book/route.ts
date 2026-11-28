import { bookingError } from '@/lib/carpool-booking-error'
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
  const { data, error } = await admin.rpc('reserve_carpool_seats', {
    p_carpool: parsedId.data,
    p_actor: user.id,
    p_seats: parsed.data.seats,
    p_contacts: parsed.data.safe_walk_contacts ?? [],
  })
  if (error) return bookingError(error.message)
  if (!data?.booking) return bookingError('')
  return NextResponse.json({ booking: data.booking }, { status: data.replayed ? 200 : 201 })
}
