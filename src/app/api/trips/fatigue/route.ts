import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const BodySchema = z.object({
  trip_id: z.string().uuid().nullable().optional(),
  level: z.number().int().min(0).max(3),
  hrv_ms: z.number().min(0).max(300).nullable().optional(),
  sleep_hours: z.number().min(0).max(24).nullable().optional(),
  source: z.enum(['healthkit', 'health_connect', 'manual', 'computed', 'none']),
  acknowledged: z.boolean().optional(),
})

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient(req)
  const {
    data: { user },
  } = await sb.auth.getUser()
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

  // Score HRV/Sleep 0..100 dérivés (utilisés pour l'agrégation insurance).
  const hrvScore = parsed.data.hrv_ms !== null && parsed.data.hrv_ms !== undefined
    ? Math.min(100, Math.max(0, Math.round((parsed.data.hrv_ms / 80) * 100)))
    : null
  const sleepScore = parsed.data.sleep_hours !== null && parsed.data.sleep_hours !== undefined
    ? Math.min(100, Math.max(0, Math.round((parsed.data.sleep_hours / 8) * 100)))
    : null

  // Source 'none' n'est pas stockée en DB (contrainte CHECK) — on ne log que
  // si une source réelle existe. Sinon on retourne 200 silencieux.
  if (parsed.data.source === 'none') {
    return NextResponse.json({ logged: false, reason: 'no_source' })
  }

  const { error } = await admin.from('fatigue_sessions').insert({
    user_id: user.id,
    trip_id: parsed.data.trip_id ?? null,
    hrv_score: hrvScore,
    sleep_score: sleepScore,
    sleep_hours: parsed.data.sleep_hours ?? null,
    source: parsed.data.source,
    break_recommended_at: parsed.data.level >= 2 ? new Date().toISOString() : null,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Impossible d’enregistrer ton état de fatigue. Réessaie.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ logged: true, level: parsed.data.level })
}
