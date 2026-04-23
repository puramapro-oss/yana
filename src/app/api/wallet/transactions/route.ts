import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 30

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsedLimit = parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_LIMIT
    ? parsedLimit
    : DEFAULT_LIMIT

  const admin = createServiceClient()

  const [txRes, withdrawalsRes] = await Promise.all([
    admin
      .from('wallet_transactions')
      .select('id, user_id, amount_cents, direction, reason, ref_type, ref_id, balance_after_cents, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('withdrawals')
      .select('id, amount_cents, iban_masked, status, requested_at, processed_at, rejection_reason')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(20),
  ])

  if (txRes.error) {
    return NextResponse.json({ error: 'transactions_fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({
    transactions: txRes.data ?? [],
    withdrawals: withdrawalsRes.data ?? [],
  })
}
