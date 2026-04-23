import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import type { ReferralTier } from '@/hooks/useReferral'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIERS: Array<{ tier: ReferralTier; threshold: number }> = [
  { tier: 'debutant', threshold: 0 },
  { tier: 'bronze', threshold: 5 },
  { tier: 'argent', threshold: 10 },
  { tier: 'or', threshold: 25 },
  { tier: 'platine', threshold: 50 },
  { tier: 'diamant', threshold: 75 },
  { tier: 'legende', threshold: 100 },
]

function computeTier(count: number): { tier: ReferralTier; next: { tier: ReferralTier; threshold: number } | null } {
  let current: ReferralTier = 'debutant'
  let next: { tier: ReferralTier; threshold: number } | null = { tier: 'bronze', threshold: 5 }
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (count >= TIERS[i].threshold) {
      current = TIERS[i].tier
      next = i < TIERS.length - 1 ? TIERS[i + 1] : null
      break
    }
  }
  return { tier: current, next }
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()

  const [n1Res, n2Res, n3Res, commissionsRes, latestReferralsRes, latestCommissionsRes] = await Promise.all([
    admin.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('tier', 1),
    admin.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('tier', 2),
    admin.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('tier', 3),
    admin.from('commissions').select('amount_cents, status').eq('user_id', user.id),
    admin
      .from('referrals')
      .select('id, referrer_id, referred_id, ip_hash, status, first_payment_at, commission_cents, tier, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('commissions')
      .select('id, user_id, referral_id, amount_cents, commission_type, source, stripe_invoice_id, status, credited_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const n1Count = n1Res.count ?? 0
  const n2Count = n2Res.count ?? 0
  const n3Count = n3Res.count ?? 0
  const totalCount = n1Count + n2Count + n3Count

  let commissionCentsPending = 0
  let commissionCentsCredited = 0
  let commissionCentsPaidOut = 0
  for (const row of (commissionsRes.data ?? []) as Array<{ amount_cents: number; status: string }>) {
    if (row.status === 'pending') commissionCentsPending += row.amount_cents
    else if (row.status === 'credited') commissionCentsCredited += row.amount_cents
    else if (row.status === 'paid_out') commissionCentsPaidOut += row.amount_cents
  }

  const { tier, next } = computeTier(n1Count) // tier basé sur filleuls directs (N1)

  // Résolution noms des filleuls récents (sur referred_id valides)
  const referredIds = Array.from(
    new Set(
      ((latestReferralsRes.data ?? []) as Array<{ referred_id: string | null }>)
        .map((r) => r.referred_id)
        .filter((id): id is string => !!id),
    ),
  )

  let profilesMap = new Map<string, { full_name: string | null; email: string | null }>()
  if (referredIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', referredIds)
    for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
      profilesMap.set(p.id, { full_name: p.full_name, email: p.email })
    }
  }

  const latest = ((latestReferralsRes.data ?? []) as Array<{
    id: string
    referrer_id: string
    referred_id: string | null
    ip_hash: string | null
    status: string
    first_payment_at: string | null
    commission_cents: number
    tier: number
    created_at: string
  }>).map((r) => {
    const prof = r.referred_id ? profilesMap.get(r.referred_id) : null
    return {
      ...r,
      referred_full_name: prof?.full_name ?? null,
      referred_email: prof?.email ?? null,
    }
  })

  return NextResponse.json({
    n1Count,
    n2Count,
    n3Count,
    totalCount,
    commissionCentsPending,
    commissionCentsCredited,
    commissionCentsPaidOut,
    tier,
    nextTier: next,
    latest,
    latestCommissions: latestCommissionsRes.data ?? [],
  })
}
