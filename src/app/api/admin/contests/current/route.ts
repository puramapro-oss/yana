import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'
import { getWeeklyPeriod, getMonthlyPeriod } from '@/lib/contest-period'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Retourne l'état des concours/tirages en cours :
// - Classement hebdo : période courante + préview des tops estimés depuis profiles
// - Tirage mensuel : période courante + compteur de tickets en circulation
// - Historique : 10 derniers contest_results + 10 derniers karma_draws completed
export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const admin = createServiceClient()
  const now = new Date()
  const weekly = getWeeklyPeriod(now)
  const monthly = getMonthlyPeriod(now)

  const [weeklyExisting, monthlyExisting, rewardPool, ticketsActive, pastResults, pastDraws] = await Promise.all([
    admin
      .from('contest_results')
      .select('id, period_start, period_end, total_pool_cents, winners, completed_at')
      .eq('period_type', 'weekly')
      .eq('period_start', weekly.start)
      .maybeSingle(),
    admin
      .from('karma_draws')
      .select('id, period_start, period_end, pool_cents, status, drawn_at')
      .eq('game_type', 'monthly_tournament')
      .eq('period_start', monthly.start)
      .maybeSingle(),
    admin
      .from('pool_balances')
      .select('balance_cents')
      .eq('pool_type', 'reward_users')
      .maybeSingle(),
    admin
      .from('karma_tickets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${monthly.start}T00:00:00Z`),
    admin
      .from('contest_results')
      .select('id, period_type, period_start, period_end, total_pool_cents, winners, completed_at')
      .order('completed_at', { ascending: false })
      .limit(10),
    admin
      .from('karma_draws')
      .select('id, game_type, period_start, period_end, pool_cents, status, drawn_at')
      .in('status', ['completed', 'cancelled'])
      .order('drawn_at', { ascending: false })
      .limit(10),
  ])

  const rewardPoolCents = Number(rewardPool.data?.balance_cents ?? 0)
  const estimatedWeeklyPool = Math.floor(rewardPoolCents * 0.06)
  const estimatedMonthlyPool = Math.floor(rewardPoolCents * 0.04)

  return NextResponse.json({
    weekly: {
      period_start: weekly.start,
      period_end: weekly.end,
      already_drawn: Boolean(weeklyExisting.data),
      existing: weeklyExisting.data ?? null,
      estimated_pool_cents: estimatedWeeklyPool,
    },
    monthly: {
      period_start: monthly.start,
      period_end: monthly.end,
      already_drawn: Boolean(monthlyExisting.data && monthlyExisting.data.status === 'completed'),
      existing: monthlyExisting.data ?? null,
      estimated_pool_cents: estimatedMonthlyPool,
      tickets_in_circulation: ticketsActive.count ?? 0,
    },
    pools: {
      reward_users_cents: rewardPoolCents,
    },
    history: {
      contest_results: pastResults.data ?? [],
      karma_draws: pastDraws.data ?? [],
    },
  })
}
