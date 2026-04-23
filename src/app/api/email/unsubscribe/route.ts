import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

// Désabonnement 1-clic. Deux modes :
//   GET  ?token=xxx              → redirige vers /email/unsubscribed après opt-out
//   POST (List-Unsubscribe-Post) → idem (conforme RFC 8058 "One-Click")
//
// Le token vient de email_sequences.unsubscribe_token (injecté dans chaque email envoyé).
// Un token valide identifie user_id et fait basculer l'état dans email_unsubscribes.

async function handle(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  }

  const supa = createServiceClient()
  const { data: row } = await supa
    .from('email_sequences')
    .select('user_id')
    .eq('unsubscribe_token', token)
    .maybeSingle()
  if (!row) {
    return NextResponse.json({ error: 'token_not_found' }, { status: 404 })
  }

  // upsert via ON CONFLICT DO NOTHING — idempotent si déjà unsubscribed
  await supa
    .from('email_unsubscribes')
    .upsert({ user_id: row.user_id, source: 'link' }, { onConflict: 'user_id', ignoreDuplicates: true })

  // Pour les POST List-Unsubscribe-Post → 200 JSON (RFC 8058)
  if (req.method === 'POST') {
    return NextResponse.json({ ok: true })
  }

  // Pour les GET → redirige vers page de confirmation
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://yana.purama.dev'
  return NextResponse.redirect(`${appUrl.replace(/\/+$/, '')}/email/unsubscribed`, 302)
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
