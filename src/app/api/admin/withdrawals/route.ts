import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export async function GET(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')?.trim() || 'pending'
  const allowed = ['pending', 'processing', 'completed', 'rejected', 'cancelled']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('withdrawals')
    .select('id, user_id, amount_cents, iban_masked, status, requested_at, processed_at, rejection_reason')
    .eq('status', status)
    .order('requested_at', { ascending: true })
    .limit(PAGE_SIZE)

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger les retraits.' },
      { status: 500 },
    )
  }

  const userIds = Array.from(new Set((data ?? []).map((w) => w.user_id).filter(Boolean)))
  const profileMap: Record<string, { email: string; full_name: string | null }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { email: p.email, full_name: p.full_name }
    }
  }

  const enriched = (data ?? []).map((w) => ({
    ...w,
    user_email: profileMap[w.user_id]?.email ?? null,
    user_name: profileMap[w.user_id]?.full_name ?? null,
  }))

  return NextResponse.json({ withdrawals: enriched, status })
}
