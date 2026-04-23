import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()

  const [profileRes, pendingWithdrawalsRes, allWithdrawalsRes] = await Promise.all([
    admin.from('profiles').select('wallet_balance_cents').eq('id', user.id).single(),
    admin
      .from('withdrawals')
      .select('amount_cents, status, requested_at')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('requested_at', { ascending: false }),
    admin
      .from('withdrawals')
      .select('amount_cents, status')
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ])

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 })
  }

  const balanceCents = profileRes.data.wallet_balance_cents ?? 0
  const pendingCents = (pendingWithdrawalsRes.data ?? []).reduce((sum, w) => sum + w.amount_cents, 0)
  const withdrawnCents = (allWithdrawalsRes.data ?? []).reduce((sum, w) => sum + w.amount_cents, 0)
  const hasActiveWithdrawal = (pendingWithdrawalsRes.data ?? []).length > 0

  return NextResponse.json({
    balanceCents,
    pendingCents,
    withdrawnCents,
    hasActiveWithdrawal,
    minWithdrawalCents: 500,
  })
}
