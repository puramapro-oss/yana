import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeekBounds } from '@/lib/contest-period'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  referrals: number
  missions: number
  rank: number
}

export async function GET() {
  const admin = createServiceClient()
  const { start, end } = getCurrentWeekBounds()

  // Parrainages N1 (tier=1) créés cette semaine par chaque referrer
  // Missions approuvées cette semaine (via wallet_transactions reason='mission_reward')
  const [referralsRes, missionsRes, profilesRes] = await Promise.all([
    admin
      .from('referrals')
      .select('referrer_id')
      .eq('tier', 1)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    admin
      .from('wallet_transactions')
      .select('user_id')
      .in('reason', ['mission_reward', 'carpool_dual_reward', 'green_drive_reward', 'safe_drive_reward'])
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    admin.from('profiles').select('id, full_name, email').limit(500),
  ])

  const referralCount = new Map<string, number>()
  for (const r of referralsRes.data ?? []) {
    referralCount.set(r.referrer_id, (referralCount.get(r.referrer_id) ?? 0) + 1)
  }

  const missionCount = new Map<string, number>()
  for (const m of missionsRes.data ?? []) {
    missionCount.set(m.user_id, (missionCount.get(m.user_id) ?? 0) + 1)
  }

  const profilesById = new Map<string, { full_name: string | null; email: string }>()
  for (const p of profilesRes.data ?? []) {
    profilesById.set(p.id, { full_name: p.full_name, email: p.email })
  }

  // Score = parrainages × 10 + missions × 3
  // (abonnements + jours actifs seront branchés en P4 avec tables dédiées)
  const allUserIds = new Set<string>([...referralCount.keys(), ...missionCount.keys()])
  const entries: LeaderboardEntry[] = Array.from(allUserIds)
    .map((userId) => {
      const referrals = referralCount.get(userId) ?? 0
      const missions = missionCount.get(userId) ?? 0
      const score = referrals * 10 + missions * 3
      const profile = profilesById.get(userId)
      const displayName = maskDisplayName(profile)
      return { userId, displayName, referrals, missions, score, rank: 0 }
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  entries.forEach((e, i) => {
    e.rank = i + 1
  })

  return NextResponse.json({
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    leaderboard: entries,
    participantCount: allUserIds.size,
  })
}

function maskDisplayName(profile: { full_name: string | null; email: string } | undefined): string {
  if (!profile) return 'Anonyme'
  if (profile.full_name) return profile.full_name
  const [local] = profile.email.split('@')
  return local.length > 2 ? `${local.slice(0, 2)}…` : local
}
