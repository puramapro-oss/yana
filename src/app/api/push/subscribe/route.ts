import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
  userAgent: z.string().max(512).optional(),
})

export async function POST(req: Request) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = SubscriptionSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 })
  }

  const svc = createServiceClient()

  // upsert par endpoint (re-subscribe après revocation = réactive)
  const { error } = await svc
    .from('web_push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: parsed.data.userAgent ?? null,
        enabled: true,
        failure_count: 0,
        last_active: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  if (error) {
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  }

  // Seed default preferences pour daily si absentes
  await svc
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        type: 'daily',
        enabled: true,
        days_of_week: [1, 2, 3, 4, 5],
        hour_start: 9,
        hour_end: 20,
        frequency: 'normal',
      },
      { onConflict: 'user_id,type', ignoreDuplicates: true },
    )

  return NextResponse.json({ ok: true })
}
