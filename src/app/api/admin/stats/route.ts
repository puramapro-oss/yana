import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PoolRow {
  pool_type: string
  balance_cents: number
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status })
  }

  const admin = createServiceClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersTotal,
    usersActive7d,
    tripsTotal,
    carpoolsTotal,
    treesTotal,
    withdrawalsPending,
    ticketsOpen,
    pools,
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('trips')
      .select('user_id', { count: 'exact', head: true })
      .gte('started_at', sevenDaysAgo),
    admin.from('trips').select('id', { count: 'exact', head: true }),
    admin.from('carpools').select('id', { count: 'exact', head: true }),
    admin.from('trees_planted').select('id', { count: 'exact', head: true }),
    admin
      .from('withdrawals')
      .select('amount_cents', { count: 'exact' })
      .eq('status', 'pending'),
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    admin.from('pool_balances').select('pool_type, balance_cents'),
  ])

  const pendingSum = (withdrawalsPending.data ?? []).reduce(
    (acc: number, row: { amount_cents: number | null }) => acc + Number(row.amount_cents ?? 0),
    0,
  )

  const poolRows = (pools.data ?? []) as PoolRow[]
  const poolsMap: Record<string, number> = {}
  for (const row of poolRows) {
    poolsMap[row.pool_type] = Number(row.balance_cents ?? 0)
  }

  return NextResponse.json({
    users: {
      total: usersTotal.count ?? 0,
      active_7d: usersActive7d.count ?? 0,
    },
    trips_total: tripsTotal.count ?? 0,
    carpools_total: carpoolsTotal.count ?? 0,
    trees_planted_total: treesTotal.count ?? 0,
    withdrawals: {
      pending_count: withdrawalsPending.count ?? 0,
      pending_sum_cents: pendingSum,
    },
    tickets_open: ticketsOpen.count ?? 0,
    pools: {
      reward_users_cents: poolsMap['reward_users'] ?? 0,
      asso_purama_cents: poolsMap['asso_purama'] ?? 0,
      sasu_purama_cents: poolsMap['sasu_purama'] ?? 0,
      eco_trees_cents: poolsMap['eco_trees'] ?? 0,
    },
  })
}
