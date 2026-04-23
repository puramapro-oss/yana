import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AchievementRow {
  id: string
  slug: string
  title: string
  description: string
  icon: string | null
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | string
  points_reward: number
  condition_json: Record<string, number>
}

interface UserStats {
  total_trips: number
  total_distance_km: number
  trees_planted: number
  co2_offset_kg: number
  streak_days: number
  seeds_balance: number
  referrals_count: number
  carpool_completions: number
  // placeholders — ces métriques sont collectées mais pas encore agrégées dans profiles;
  // les achievements correspondants resteront verrouillés tant que la valeur n'est pas
  // remontée, ce qui est le comportement attendu en MVP.
  night_trips: number
  off_peak_completions: number
  moto_kit_trips: number
  zero_phone_completions: number
  mentor_completions: number
  jackpot_terre_won: number
  min_safety_score: number
}

function isUnlocked(stats: UserStats, condition: Record<string, number>): boolean {
  for (const [key, requiredValue] of Object.entries(condition)) {
    const actual = (stats as unknown as Record<string, number>)[key] ?? 0
    if (actual < requiredValue) return false
  }
  return true
}

function progressPct(stats: UserStats, condition: Record<string, number>): number {
  // Progress = min ratio parmi toutes les conditions
  let minRatio = 1
  for (const [key, required] of Object.entries(condition)) {
    const actual = (stats as unknown as Record<string, number>)[key] ?? 0
    if (required > 0) {
      minRatio = Math.min(minRatio, actual / required)
    }
  }
  return Math.max(0, Math.min(100, Math.round(minRatio * 100)))
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()

  const [profileRes, achievementsRes, unlockedRes, referralsCountRes, carpoolCountRes] = await Promise.all([
    admin
      .from('profiles')
      .select('total_trips, total_distance_km, trees_planted_total, co2_offset_total_kg, streak_days, seeds_balance, purama_points, xp, level')
      .eq('id', user.id)
      .single(),
    admin
      .from('achievements')
      .select('id, slug, title, description, icon, rarity, points_reward, condition_json')
      .order('points_reward', { ascending: true }),
    admin
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id),
    admin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('tier', 1),
    admin
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reason', 'carpool_dual_reward'),
  ])

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 })
  }
  if (achievementsRes.error) {
    return NextResponse.json({ error: 'achievements_fetch_failed' }, { status: 500 })
  }

  const profile = profileRes.data
  const unlockedById = new Map<string, string>()
  for (const ua of unlockedRes.data ?? []) {
    unlockedById.set(ua.achievement_id, ua.unlocked_at)
  }

  const stats: UserStats = {
    total_trips: Number(profile.total_trips ?? 0),
    total_distance_km: Number(profile.total_distance_km ?? 0),
    trees_planted: Number(profile.trees_planted_total ?? 0),
    co2_offset_kg: Number(profile.co2_offset_total_kg ?? 0),
    streak_days: Number(profile.streak_days ?? 0),
    seeds_balance: Number(profile.seeds_balance ?? 0),
    referrals_count: referralsCountRes.count ?? 0,
    carpool_completions: carpoolCountRes.count ?? 0,
    night_trips: 0,
    off_peak_completions: 0,
    moto_kit_trips: 0,
    zero_phone_completions: 0,
    mentor_completions: 0,
    jackpot_terre_won: 0,
    min_safety_score: 0,
  }

  const achievements = (achievementsRes.data ?? []) as AchievementRow[]

  const enriched = achievements.map((a) => {
    const already = unlockedById.get(a.id) ?? null
    const shouldBeUnlocked = already !== null || isUnlocked(stats, a.condition_json)
    const progress = already !== null ? 100 : progressPct(stats, a.condition_json)
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      pointsReward: a.points_reward,
      condition: a.condition_json,
      unlocked: shouldBeUnlocked,
      unlockedAt: already,
      progress,
    }
  })

  const unlockedCount = enriched.filter((a) => a.unlocked).length
  const totalXpFromUnlocks = enriched
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.pointsReward, 0)

  return NextResponse.json({
    achievements: enriched,
    stats: {
      unlockedCount,
      totalCount: enriched.length,
      totalXpFromUnlocks,
      profileXp: Number(profile.xp ?? 0),
      profileLevel: Number(profile.level ?? 1),
      profilePoints: Number(profile.purama_points ?? 0),
    },
  })
}
