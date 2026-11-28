import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

const requestSchema = z.object({ target: z.enum(['trip', 'booking']) }).strict()

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const { id } = await ctx.params
  const body = requestSchema.safeParse(await req.json().catch(() => null))
  if (!z.string().uuid().safeParse(id).success || !body.success) {
    return NextResponse.json({ error: 'Demande d’annulation invalide.' }, { status: 400 })
  }
  const { data, error } = await createServiceClient().rpc('cancel_carpool_participation', {
    p_carpool_id: id, p_user_id: user.id, p_target: body.data.target,
  })
  if (error) return NextResponse.json({ error: 'Annulation indisponible.' }, { status: 503 })
  if (data === 'cancelled') return NextResponse.json({ status: 'cancelled' })
  if (data === 'not_found') {
    return NextResponse.json({ error: 'Trajet ou réservation introuvable.' }, { status: 404 })
  }
  if (data === 'unavailable') {
    return NextResponse.json({ error: 'L’état actuel de ce trajet ne permet plus cette annulation.' }, { status: 409 })
  }
  return NextResponse.json({ error: 'État de l’annulation inconnu.' }, { status: 503 })
}
