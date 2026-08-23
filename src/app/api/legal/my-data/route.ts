/**
 * GET /api/legal/my-data — export complet des données personnelles au format JSON
 * (droit à la portabilité, art. 20 RGPD ; page « Ma mémoire »).
 * EXTRA_TABLES = tables métier réelles du schéma `yana` contenant une colonne user_id
 * directe (vérifié en base 2026-08-23 — messages/referrals/carpool_bookings/trip_events
 * n'ont pas de user_id direct et ne sont pas couverts ici).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const EXTRA_TABLES: Array<{ table: string; userIdColumn: string }> = [
  { table: 'conversations', userIdColumn: 'user_id' },
  { table: 'trips', userIdColumn: 'user_id' },
  { table: 'vehicles', userIdColumn: 'user_id' },
  { table: 'wallet_transactions', userIdColumn: 'user_id' },
  { table: 'withdrawals', userIdColumn: 'user_id' },
  { table: 'payments', userIdColumn: 'user_id' },
  { table: 'invoices', userIdColumn: 'user_id' },
  { table: 'commissions', userIdColumn: 'user_id' },
  { table: 'kyc_verifications', userIdColumn: 'user_id' },
  { table: 'notifications', userIdColumn: 'user_id' },
  { table: 'push_tokens', userIdColumn: 'user_id' },
  { table: 'support_tickets', userIdColumn: 'user_id' },
  { table: 'user_achievements', userIdColumn: 'user_id' },
]

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const [{ data: profile }, { data: acceptances }, { data: cookieConsent }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('legal_acceptances').select('doc_type, version, accepted_at').eq('user_id', user.id),
    supabase.from('cookie_consents').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const extra: Record<string, unknown> = {}
  for (const { table, userIdColumn } of EXTRA_TABLES) {
    const { data } = await supabase.from(table).select('*').eq(userIdColumn, user.id)
    extra[table] = data ?? []
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    compte: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: profile ?? null,
    acceptationsLegales: acceptances ?? [],
    consentementCookies: cookieConsent ?? null,
    ...extra,
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mes-donnees.json"',
    },
  })
}
