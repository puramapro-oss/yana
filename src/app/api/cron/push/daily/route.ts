import { NextResponse } from 'next/server'
import { runDailyPushes } from '@/lib/notifications/schedule'

export const runtime = 'nodejs'
export const maxDuration = 300

// CRON quotidien — n8n 10h UTC :
// POST https://yana.purama.dev/api/cron/push/daily
// Header : Authorization: Bearer $CRON_SECRET (ou ?token=...)
//
// Scanne subscriptions actives, filtre par fenêtre horaire/jour/pause,
// envoie push daily adapté à l'engagement score. Idempotent via unique
// index push_log(user_id, type='daily', sent_day).

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('token') === expected
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(5000, Math.max(1, parseInt(limitParam, 10))) : 1000

    const stats = await runDailyPushes(limit)
    return NextResponse.json({ ok: true, stats })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'cron_failed', detail: msg }, { status: 500 })
  }
}

export const GET = POST
