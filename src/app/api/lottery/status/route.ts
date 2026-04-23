import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TICKET_SOURCES = [
  'signup', 'referral', 'mission', 'share', 'review',
  'challenge', 'streak', 'subscription', 'points_purchase', 'daily',
] as const
type TicketSource = typeof TICKET_SOURCES[number]

const LOTTERY_GAME_TYPE = 'monthly_tournament'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()

  const [ticketsRes, nextDrawRes, pastDrawsRes] = await Promise.all([
    // Mes tickets non utilisés (tous, toutes sources confondues)
    admin
      .from('karma_tickets')
      .select('id, source, used, draw_id, created_at')
      .eq('user_id', user.id)
      .eq('used', false)
      .order('created_at', { ascending: false }),
    // Prochain tirage mensuel (upcoming ou live)
    admin
      .from('karma_draws')
      .select('id, game_type, period_start, period_end, pool_cents, max_winners, status, drawn_at')
      .eq('game_type', LOTTERY_GAME_TYPE)
      .in('status', ['upcoming', 'live'])
      .order('period_end', { ascending: true })
      .limit(1)
      .maybeSingle(),
    // 3 derniers tirages complétés avec leurs winners
    admin
      .from('karma_draws')
      .select('id, game_type, period_start, period_end, pool_cents, max_winners, status, drawn_at')
      .eq('game_type', LOTTERY_GAME_TYPE)
      .eq('status', 'completed')
      .order('drawn_at', { ascending: false, nullsFirst: false })
      .limit(3),
  ])

  const tickets = ticketsRes.data ?? []
  const breakdown: Record<TicketSource, number> = {
    signup: 0, referral: 0, mission: 0, share: 0, review: 0,
    challenge: 0, streak: 0, subscription: 0, points_purchase: 0, daily: 0,
  }
  for (const t of tickets) {
    if ((TICKET_SOURCES as readonly string[]).includes(t.source)) {
      breakdown[t.source as TicketSource] += 1
    }
  }

  // Fetch winners pour les past draws pour enrichir l'historique
  const pastDrawIds = (pastDrawsRes.data ?? []).map((d) => d.id)
  let winnersByDraw: Record<string, Array<{ rank: number; display_name: string; amount_cents: number }>> = {}
  if (pastDrawIds.length > 0) {
    const winnersRes = await admin
      .from('karma_winners')
      .select('draw_id, user_id, rank, amount_cents')
      .in('draw_id', pastDrawIds)
      .order('rank', { ascending: true })

    const userIds = Array.from(new Set((winnersRes.data ?? []).map((w) => w.user_id)))
    const profilesMap = new Map<string, { full_name: string | null; email: string }>()
    if (userIds.length > 0) {
      const profilesRes = await admin.from('profiles').select('id, full_name, email').in('id', userIds)
      for (const p of profilesRes.data ?? []) {
        profilesMap.set(p.id, { full_name: p.full_name, email: p.email })
      }
    }

    winnersByDraw = (winnersRes.data ?? []).reduce<typeof winnersByDraw>((acc, w) => {
      if (!acc[w.draw_id]) acc[w.draw_id] = []
      const profile = profilesMap.get(w.user_id)
      const displayName = profile?.full_name
        ?? (profile ? maskEmail(profile.email) : 'Anonyme')
      acc[w.draw_id].push({ rank: w.rank, display_name: displayName, amount_cents: w.amount_cents })
      return acc
    }, {})
  }

  const pastDraws = (pastDrawsRes.data ?? []).map((d) => ({
    ...d,
    winners: winnersByDraw[d.id] ?? [],
  }))

  return NextResponse.json({
    totalTickets: tickets.length,
    breakdown,
    nextDraw: nextDrawRes.data ?? null,
    pastDraws,
  })
}

function maskEmail(email: string): string {
  const [local] = email.split('@')
  return local.length > 2 ? `${local.slice(0, 2)}…` : local
}
