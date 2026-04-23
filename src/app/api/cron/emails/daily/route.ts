import { NextResponse } from 'next/server'
import { runDailyEmails } from '@/lib/email/schedule'

export const runtime = 'nodejs'
export const maxDuration = 300

// CRON quotidien — n8n 9h UTC :
// POST https://yana.purama.dev/api/cron/emails/daily
// Header : Authorization: Bearer $CRON_SECRET (ou ?token=...)
//
// Scanne profiles âgés de 0 à 37j, envoie le template daily approprié
// selon l'offset (J0/1/3/7/14/21/30) si pas déjà envoyé.
// Idempotent via unique index email_sequences.

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

    const stats = await runDailyEmails(limit)
    return NextResponse.json({ ok: true, stats })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'cron_failed', detail: msg }, { status: 500 })
  }
}

// GET pour tests manuels (avec ?token=)
export const GET = POST
