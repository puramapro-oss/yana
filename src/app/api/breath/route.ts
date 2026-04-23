import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  protocol: z.enum(['4-7-8', 'box', 'coherence']).default('4-7-8'),
  duration_sec: z.number().int().min(10).max(3600),
})

// POST /api/breath — log une session de respiration complétée.
// XP éveil selon durée (1 XP par 30s, max 30 XP/session).
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const { error } = await admin.from('breath_sessions').insert({
    user_id: auth.user.id,
    protocol: parsed.data.protocol,
    duration_sec: parsed.data.duration_sec,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer la session.' },
      { status: 500 },
    )
  }

  const xp = Math.min(30, Math.floor(parsed.data.duration_sec / 30))
  if (xp > 0) {
    await admin.from('awakening_events').insert({
      user_id: auth.user.id,
      event_type: 'breath_session',
      xp_gained: xp,
    })
  }

  return NextResponse.json({ ok: true, xp_earned: xp })
}
