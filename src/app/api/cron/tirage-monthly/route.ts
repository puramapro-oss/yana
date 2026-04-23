import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentMonthBounds, getMonthlyPeriod } from '@/lib/contest-period'
import { computeMonthlyPool, pickRandomWinners } from '@/lib/contest-distribution'

export const runtime = 'nodejs'
export const maxDuration = 60

// CRON mensuel — dernier jour du mois 23h59 UTC via n8n :
// POST https://yana.purama.dev/api/cron/tirage-monthly
// Header : Authorization: Bearer $CRON_SECRET
//
// - Récupère tous les karma_tickets créés dans le mois écoulé (pas encore assignés à un draw)
// - Tirage aléatoire de 10 winners uniques (1 user = 1 chance max même avec N tickets)
// - Pool = 4% de pool_balances.reward_users
// - Répartition 1.2/0.8/0.6/0.4 puis 1% sur rangs 5-10
// - Insert karma_draws + karma_winners + notifications + wallet_transactions
// - Idempotent : skip si karma_draw 'monthly_tournament' existe déjà pour cette période

interface TicketRow {
  id: string
  user_id: string
}

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('token') === expected
}

async function run(): Promise<{
  status: 'done' | 'already_drawn' | 'no_tickets'
  draw_id?: string
  period_start: string
  period_end: string
  total_pool_cents: number
  winners_count: number
}> {
  const admin = createServiceClient()
  const now = new Date()
  const { start: currentMonthStart, end: currentMonthEnd } = getCurrentMonthBounds(now)

  // Si on tourne le dernier jour du mois > 20h UTC, on vise le mois courant.
  // Sinon, on vise le mois précédent (pour rattraper si CRON a glissé).
  const isEndOfMonth =
    now.getUTCDate() === currentMonthEnd.getUTCDate() && now.getUTCHours() >= 20
  const targetStart = isEndOfMonth
    ? currentMonthStart
    : new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1))
  const { start: targetStartDate, end: targetEndDate } = getMonthlyPeriod(targetStart)
  const startIso = new Date(`${targetStartDate}T00:00:00Z`).toISOString()
  const endIso = new Date(`${targetEndDate}T23:59:59Z`).toISOString()

  // Idempotence
  const { data: existing } = await admin
    .from('karma_draws')
    .select('id, status')
    .eq('game_type', 'monthly_tournament')
    .eq('period_start', targetStartDate)
    .in('status', ['completed'])
    .maybeSingle()

  if (existing) {
    return {
      status: 'already_drawn',
      draw_id: existing.id,
      period_start: targetStartDate,
      period_end: targetEndDate,
      total_pool_cents: 0,
      winners_count: 0,
    }
  }

  // Tickets du mois (anti-duplicate user via Set)
  const { data: ticketsRaw } = await admin
    .from('karma_tickets')
    .select('id, user_id, created_at, draw_id')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .is('draw_id', null)

  const tickets = (ticketsRaw ?? []) as TicketRow[]

  // Pool
  const { data: pool } = await admin
    .from('pool_balances')
    .select('balance_cents')
    .eq('pool_type', 'reward_users')
    .maybeSingle()
  const rewardBalance = Number(pool?.balance_cents ?? 0)
  const { totalPoolCents, distribution } = computeMonthlyPool(rewardBalance)

  // Créer le draw
  const { data: draw, error: drawErr } = await admin
    .from('karma_draws')
    .insert({
      game_type: 'monthly_tournament',
      period_start: targetStartDate,
      period_end: targetEndDate,
      pool_cents: totalPoolCents,
      max_winners: 10,
      status: 'live',
      drawn_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (drawErr || !draw) {
    throw new Error(`karma_draws insert failed: ${drawErr?.message ?? 'unknown'}`)
  }

  if (tickets.length === 0) {
    await admin.from('karma_draws').update({ status: 'cancelled' }).eq('id', draw.id)
    return {
      status: 'no_tickets',
      draw_id: draw.id,
      period_start: targetStartDate,
      period_end: targetEndDate,
      total_pool_cents: totalPoolCents,
      winners_count: 0,
    }
  }

  // Déduplique par user (1 chance = 1 user max), pioche 10
  const byUser = new Map<string, TicketRow>()
  for (const t of tickets) {
    if (!byUser.has(t.user_id)) byUser.set(t.user_id, t)
  }
  const uniquePool = Array.from(byUser.values())
  const winnersTickets = pickRandomWinners(uniquePool, 10)

  // Profile infos
  const userIds = winnersTickets.map((w) => w.user_id)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, wallet_balance_cents')
    .in('id', userIds)
  const profileMap = new Map<string, { full_name: string | null; email: string; wallet_balance_cents: number }>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      full_name: p.full_name,
      email: p.email,
      wallet_balance_cents: Number(p.wallet_balance_cents ?? 0),
    })
  }

  // Insert karma_winners + crédits wallet + notifications
  for (let i = 0; i < winnersTickets.length; i++) {
    const winner = winnersTickets[i]
    const rank = i + 1
    const amountCents = totalPoolCents > 0 ? (distribution[i] ?? 0) : 0
    const prof = profileMap.get(winner.user_id)
    const displayName = prof?.full_name || (prof?.email?.split('@')[0] ?? 'Inconnu')

    await admin.from('karma_winners').insert({
      draw_id: draw.id,
      user_id: winner.user_id,
      ticket_id: winner.id,
      rank,
      amount_cents: amountCents,
      seeds_awarded: 0,
      claimed: false,
    })

    // Marque le ticket gagnant comme lié à ce draw
    await admin.from('karma_tickets').update({ draw_id: draw.id, used: true }).eq('id', winner.id)

    if (amountCents > 0) {
      const oldBalance = prof?.wallet_balance_cents ?? 0
      const newBalance = oldBalance + amountCents
      await admin
        .from('profiles')
        .update({ wallet_balance_cents: newBalance })
        .eq('id', winner.user_id)
      await admin.from('wallet_transactions').insert({
        user_id: winner.user_id,
        amount_cents: amountCents,
        direction: 'credit',
        reason: 'lottery_monthly_payout',
        ref_type: 'karma_draws',
        ref_id: draw.id,
        balance_after_cents: newBalance,
      })
      await admin.from('pool_transactions').insert({
        pool_type: 'reward_users',
        amount_cents: amountCents,
        direction: 'debit',
        reason: 'lottery_payout',
        metadata: {
          draw_id: draw.id,
          user_id: winner.user_id,
          rank,
          period_type: 'monthly',
        },
      })
    }

    await admin.from('notifications').insert({
      user_id: winner.user_id,
      type: 'lottery',
      title: `🎟️ Tirage mensuel — rang #${rank}`,
      body: amountCents > 0
        ? `Bravo ${displayName} ! Tu remportes ${(amountCents / 100).toFixed(2)} € crédités sur ton wallet.`
        : `Tu fais partie des 10 gagnants du tirage mensuel ${displayName} !`,
      data: { draw_id: draw.id, rank, amount_cents: amountCents },
    })
  }

  // Décrémente le pool
  if (totalPoolCents > 0) {
    const { data: poolAfter } = await admin
      .from('pool_balances')
      .select('balance_cents, total_out_cents')
      .eq('pool_type', 'reward_users')
      .maybeSingle()
    if (poolAfter) {
      const currentBalance = Number(poolAfter.balance_cents ?? 0)
      const currentOut = Number(poolAfter.total_out_cents ?? 0)
      await admin
        .from('pool_balances')
        .update({
          balance_cents: Math.max(0, currentBalance - totalPoolCents),
          total_out_cents: currentOut + totalPoolCents,
        })
        .eq('pool_type', 'reward_users')
    }
  }

  // Finalise draw
  await admin.from('karma_draws').update({ status: 'completed' }).eq('id', draw.id)

  return {
    status: 'done',
    draw_id: draw.id,
    period_start: targetStartDate,
    period_end: targetEndDate,
    total_pool_cents: totalPoolCents,
    winners_count: winnersTickets.length,
  }
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await run()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur CRON tirage-monthly.' },
      { status: 500 },
    )
  }
}

export const GET = POST
