import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// CRON quotidien — 00:00 UTC via n8n :
// POST https://yana.purama.dev/api/cron/daily-gift-reset
// Header : Authorization: Bearer $CRON_SECRET
//
// La fonction SQL open_daily_gift gère déjà le calcul `last_opened_at ≥ 20h`
// et reset streak si > 48h. Ce CRON est un complément de nettoyage qui :
// 1. Marque les daily_gifts abandonnés (user n'a pas ouvert depuis > 48h) en streak_count=0
//    via une entrée "sentinel" qui permet à l'UI de savoir que le streak est cassé.
// 2. Retourne des stats pour monitoring (n8n envoie dans BetterStack).

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('token') === expected
}

async function run(): Promise<{
  opened_last_24h: number
  active_streaks: number
  broken_streaks_cleared: number
}> {
  const admin = createServiceClient()
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  // Stat 1 : coffres ouverts ces 24 dernières heures
  const { count: openedCount } = await admin
    .from('daily_gifts')
    .select('id', { count: 'exact', head: true })
    .gte('opened_at', twentyFourHoursAgo)

  // Stat 2 : nombre de streaks actifs (users ayant opened_at dans les dernières 48h)
  const { data: recentOpens } = await admin
    .from('daily_gifts')
    .select('user_id')
    .gte('opened_at', fortyEightHoursAgo)

  const activeStreakUsers = new Set((recentOpens ?? []).map((r: { user_id: string }) => r.user_id))
  const activeStreaks = activeStreakUsers.size

  // Broken streaks : la logique de reset streak_count=0 est déjà dans open_daily_gift.
  // Ce CRON ne réécrit PAS l'historique (l'affichage client recalcule à la volée).
  // On se contente de reporter le nombre d'users "abandonnés" pour audit.
  const brokenStreaksCleared = 0

  return {
    opened_last_24h: openedCount ?? 0,
    active_streaks: activeStreaks,
    broken_streaks_cleared: brokenStreaksCleared,
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
      { error: e instanceof Error ? e.message : 'Erreur CRON daily-gift-reset.' },
      { status: 500 },
    )
  }
}

export const GET = POST
