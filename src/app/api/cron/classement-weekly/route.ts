import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeekBounds, getWeeklyPeriod } from '@/lib/contest-period'
import { computeWeeklyPool } from '@/lib/contest-distribution'

export const runtime = 'nodejs'
export const maxDuration = 60

// CRON hebdomadaire — dim 23h59 UTC via n8n :
// POST https://yana.purama.dev/api/cron/classement-weekly
// Header : Authorization: Bearer $CRON_SECRET
//
// - Calcule score de la semaine écoulée par user :
//     referrals×10 + new_subscriptions×50 + trips_completed×5 + missions_validated×3
// - Top 10 → pool 6% de pool_balances.reward_users
// - Répartition 2%/1%/0.7%/0.5%/0.4%/0.3%/0.275×4
// - Insert contest_results + karma_winners + notifications + wallet_transactions
// - Idempotent : skip si contest_results existe déjà pour cette période (period_start)

interface ScoreEntry {
  user_id: string
  score: number
  referrals: number
  subscriptions: number
  trips: number
  missions: number
}

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('token') === expected
}

async function computeScores(
  admin: ReturnType<typeof createServiceClient>,
  startIso: string,
  endIso: string,
): Promise<ScoreEntry[]> {
  const [referralsRes, paymentsRes, tripsRes, missionsRes] = await Promise.all([
    admin
      .from('referrals')
      .select('referrer_id, status, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .eq('status', 'subscribed'),
    admin
      .from('payments')
      .select('user_id, amount_cents, status, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .eq('status', 'succeeded'),
    admin
      .from('trips')
      .select('user_id, ended_at, started_at')
      .gte('started_at', startIso)
      .lte('started_at', endIso)
      .not('ended_at', 'is', null),
    admin
      .from('mission_completions')
      .select('user_id, status, completed_at')
      .gte('completed_at', startIso)
      .lte('completed_at', endIso)
      .eq('status', 'validated'),
  ])

  const map = new Map<string, ScoreEntry>()
  const bump = (userId: string, key: keyof ScoreEntry, delta: number, scoreWeight: number) => {
    const existing = map.get(userId) ?? {
      user_id: userId,
      score: 0,
      referrals: 0,
      subscriptions: 0,
      trips: 0,
      missions: 0,
    }
    ;(existing[key] as number) = (existing[key] as number) + delta
    existing.score += delta * scoreWeight
    map.set(userId, existing)
  }

  for (const r of referralsRes.data ?? []) {
    if (r.referrer_id) bump(r.referrer_id, 'referrals', 1, 10)
  }
  for (const p of paymentsRes.data ?? []) {
    if (p.user_id) bump(p.user_id, 'subscriptions', 1, 50)
  }
  for (const t of tripsRes.data ?? []) {
    if (t.user_id) bump(t.user_id, 'trips', 1, 5)
  }
  for (const m of missionsRes.data ?? []) {
    if (m.user_id) bump(m.user_id, 'missions', 1, 3)
  }

  return Array.from(map.values()).sort((a, b) => b.score - a.score)
}

async function run(): Promise<{
  status: 'done' | 'already_drawn' | 'no_users'
  contest_id?: string
  period_start: string
  period_end: string
  total_pool_cents: number
  winners_count: number
}> {
  const admin = createServiceClient()
  const now = new Date()
  const { start: weekStartDate, end: weekEndDate } = getCurrentWeekBounds(now)
  // La "semaine écoulée" = semaine qui vient de se terminer (dim 23:59:59).
  // Si on tourne le dimanche à 23h59 le CRON est bien SUR cette semaine.
  // Si on tourne lundi 00h00 par dérive n8n, getCurrentWeekBounds retourne la nouvelle
  // semaine → on vise la PRÉCÉDENTE en soustrayant 7 jours.
  const isSundayEvening = now.getUTCDay() === 0 && now.getUTCHours() >= 20
  const targetStart = isSundayEvening
    ? weekStartDate
    : new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const targetEnd = isSundayEvening
    ? weekEndDate
    : new Date(weekEndDate.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { start: targetStartDate, end: targetEndDate } = getWeeklyPeriod(targetStart)
  const startIso = targetStart.toISOString()
  const endIso = targetEnd.toISOString()

  // Idempotence : skip si existe déjà
  const { data: existing } = await admin
    .from('contest_results')
    .select('id')
    .eq('period_type', 'weekly')
    .eq('period_start', targetStartDate)
    .maybeSingle()

  if (existing) {
    return {
      status: 'already_drawn',
      contest_id: existing.id,
      period_start: targetStartDate,
      period_end: targetEndDate,
      total_pool_cents: 0,
      winners_count: 0,
    }
  }

  // Pool
  const { data: pool } = await admin
    .from('pool_balances')
    .select('balance_cents')
    .eq('pool_type', 'reward_users')
    .maybeSingle()

  const rewardBalance = Number(pool?.balance_cents ?? 0)
  const { totalPoolCents, distribution } = computeWeeklyPool(rewardBalance)

  // Scores
  const scored = await computeScores(admin, startIso, endIso)
  const top10 = scored.slice(0, 10).filter((s) => s.score > 0)

  if (top10.length === 0) {
    await admin.from('contest_results').insert({
      period_type: 'weekly',
      period_start: targetStartDate,
      period_end: targetEndDate,
      total_pool_cents: 0,
      winners: [],
    })
    return {
      status: 'no_users',
      period_start: targetStartDate,
      period_end: targetEndDate,
      total_pool_cents: 0,
      winners_count: 0,
    }
  }

  // Enrichir avec display_name
  const userIds = top10.map((t) => t.user_id)
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

  const winners = top10.map((entry, idx) => {
    const prof = profileMap.get(entry.user_id)
    const displayName = prof?.full_name || (prof?.email?.split('@')[0] ?? 'Inconnu')
    const amountCents = totalPoolCents > 0 ? (distribution[idx] ?? 0) : 0
    return {
      user_id: entry.user_id,
      display_name: displayName,
      rank: idx + 1,
      amount_cents: amountCents,
      score: entry.score,
    }
  })

  // Insert contest_results (source de vérité historique)
  const { data: inserted, error: insertErr } = await admin
    .from('contest_results')
    .insert({
      period_type: 'weekly',
      period_start: targetStartDate,
      period_end: targetEndDate,
      total_pool_cents: totalPoolCents,
      winners,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    throw new Error(`contest_results insert failed: ${insertErr?.message ?? 'unknown'}`)
  }

  // Crédits wallet + pool_transactions + notifications
  for (const winner of winners) {
    if (winner.amount_cents <= 0) continue
    const prof = profileMap.get(winner.user_id)
    const oldBalance = prof?.wallet_balance_cents ?? 0
    const newBalance = oldBalance + winner.amount_cents

    await admin
      .from('profiles')
      .update({ wallet_balance_cents: newBalance })
      .eq('id', winner.user_id)

    await admin.from('wallet_transactions').insert({
      user_id: winner.user_id,
      amount_cents: winner.amount_cents,
      direction: 'credit',
      reason: 'contest_weekly_payout',
      ref_type: 'contest_results',
      ref_id: inserted.id,
      balance_after_cents: newBalance,
    })

    await admin.from('pool_transactions').insert({
      pool_type: 'reward_users',
      amount_cents: winner.amount_cents,
      direction: 'debit',
      reason: 'contest_payout',
      metadata: {
        contest_id: inserted.id,
        user_id: winner.user_id,
        rank: winner.rank,
        period_type: 'weekly',
      },
    })

    await admin.from('notifications').insert({
      user_id: winner.user_id,
      type: 'contest',
      title: `🏆 Classement hebdo — rang #${winner.rank}`,
      body: `Bravo ${winner.display_name} ! Tu remportes ${(winner.amount_cents / 100).toFixed(2)} € crédités sur ton wallet.`,
      data: { contest_id: inserted.id, rank: winner.rank, amount_cents: winner.amount_cents },
    })
  }

  // Débit pool : une seule écriture agrégée en plus des ventilations par winner
  // (déjà loguées ci-dessus, donc on met à jour le balance en une passe unique ici)
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

  return {
    status: 'done',
    contest_id: inserted.id,
    period_start: targetStartDate,
    period_end: targetEndDate,
    total_pool_cents: totalPoolCents,
    winners_count: winners.length,
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
      { error: e instanceof Error ? e.message : 'Erreur CRON classement-weekly.' },
      { status: 500 },
    )
  }
}

// Exposition GET pour debug rapide (même guard)
export const GET = POST
