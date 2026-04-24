import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { sendPush, hashEndpoint } from '@/lib/notifications/web-push'

export const runtime = 'nodejs'

// Envoi test immédiat à TOUTES les subscriptions de l'user courant.
// Ouvert à tous les users auth (utile pour UX "Envoyer un test").
export async function POST() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data: subs } = await svc
    .from('web_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id)
    .eq('enabled', true)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no_subscription' }, { status: 200 })
  }

  let sent = 0
  const failures: string[] = []

  for (const sub of subs) {
    const { data: inserted, error: insErr } = await svc
      .from('push_log')
      .insert({
        user_id: user.id,
        type: 'test',
        title: 'YANA — test',
        body: 'Ton push fonctionne. Bienvenue à bord.',
        url: '/settings/notifications',
        endpoint_hash: hashEndpoint(sub.endpoint),
      })
      .select('id')
      .maybeSingle()

    if (insErr || !inserted) {
      failures.push(insErr?.message || 'insert_failed')
      continue
    }

    const outcome = await sendPush(
      { id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: 'YANA — test',
        body: 'Ton push fonctionne. Bienvenue à bord.',
        url: '/settings/notifications',
        type: 'test',
        logId: inserted.id,
      },
    )

    if (outcome.ok) {
      sent++
    } else {
      failures.push(outcome.error)
      await svc
        .from('push_log')
        .update({ failed: true, error: outcome.error, token_invalidated: outcome.invalidated })
        .eq('id', inserted.id)
      if (outcome.invalidated) {
        await svc
          .from('web_push_subscriptions')
          .update({ enabled: false })
          .eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ ok: true, sent, total: subs.length, failures })
}
