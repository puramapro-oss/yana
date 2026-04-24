import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

// Beacon depuis Service Worker sur notificationclick.
// Pas d'auth JWT (le SW n'a pas accès aux cookies facilement) — le logId
// agit comme token d'opacité : qui connaît l'UUID du log peut seul marquer
// l'opened. Risque faible, impact nul (fausse ouverture augmente open_rate user
// qui a déjà reçu le push).

const Schema = z.object({
  logId: z.string().uuid(),
})

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = Schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('push_log')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', parsed.data.logId)
    .is('opened_at', null)

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
