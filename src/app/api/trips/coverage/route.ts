import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

const CoverageSchema = z.object({
  trip_id: z.string().uuid(),
  accepted_fixes: z.number().int().min(2).max(2_000_000),
  observed_seconds: z.number().int().min(1).max(86_400),
  distance_m: z.number().int().min(0).max(2_000_000),
})

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  const input = CoverageSchema.safeParse(await req.json().catch(() => null))
  if (!input.success) return NextResponse.json({ error: 'Mesures invalides.' }, { status: 400 })
  const { trip_id, accepted_fixes, observed_seconds, distance_m } = input.data
  const { data, error } = await createServiceClient().rpc('record_trip_coverage', {
    p_user_id: user.id, p_trip_id: trip_id, p_fixes: accepted_fixes,
    p_observed: observed_seconds, p_distance_m: distance_m,
  })
  if (error) return NextResponse.json({ error: 'Reçu indisponible.' }, { status: 503 })
  return NextResponse.json({ received: data === true })
}
