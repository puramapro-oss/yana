import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const TYPES = ['daily', 'achievement', 'referral', 'wallet', 'contest', 'lottery'] as const

const PatchSchema = z.object({
  type: z.enum(TYPES),
  enabled: z.boolean().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  hour_start: z.number().int().min(0).max(23).optional(),
  hour_end: z.number().int().min(0).max(23).optional(),
  frequency: z.enum(['low', 'normal', 'high']).optional(),
  paused_until: z.string().datetime().nullable().optional(),
})

export async function GET() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const svc = createServiceClient()

  const { data: prefs } = await svc
    .from('notification_preferences')
    .select('type, enabled, days_of_week, hour_start, hour_end, frequency, paused_until')
    .eq('user_id', user.id)

  // Garantir 6 rows : merge avec defaults pour types absents
  const byType = new Map((prefs || []).map((p) => [p.type, p]))
  const result = TYPES.map((type) => {
    const existing = byType.get(type)
    return existing ?? {
      type,
      enabled: true,
      days_of_week: [1, 2, 3, 4, 5],
      hour_start: 9,
      hour_end: 20,
      frequency: 'normal',
      paused_until: null,
    }
  })

  // Subscription status côté serveur (best-effort ; client peut recheck SW)
  const { data: subs } = await svc
    .from('web_push_subscriptions')
    .select('id, enabled')
    .eq('user_id', user.id)
    .eq('enabled', true)

  return NextResponse.json({
    preferences: result,
    subscribed: (subs || []).length > 0,
  })
}

export async function PATCH(req: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 })
  }

  const { type, ...updates } = parsed.data

  const svc = createServiceClient()

  // Upsert : crée la row si absente, update sinon
  const { error } = await svc
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        type,
        enabled: updates.enabled ?? true,
        days_of_week: updates.days_of_week ?? [1, 2, 3, 4, 5],
        hour_start: updates.hour_start ?? 9,
        hour_end: updates.hour_end ?? 20,
        frequency: updates.frequency ?? 'normal',
        paused_until: updates.paused_until ?? null,
      },
      { onConflict: 'user_id,type' },
    )

  if (error) {
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
