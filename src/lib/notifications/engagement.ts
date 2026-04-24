// Calcul engagement-score (0-100) + décision ton + fréquence.
// Score agrège : récence activité + taux d'ouverture historique push + streak.

import { createServiceClient } from '@/lib/supabase'

export type NotificationStyle = 'encouraging' | 'informative' | 'warm'
export type Frequency = 'low' | 'normal' | 'high'

export interface EngagementDecision {
  score: number
  style: NotificationStyle
  messagesPerWeek: number
}

/**
 * Score composite 0-100 = recency (0-40) + open_rate (0-40) + streak (0-20).
 * - Récence : last_active <1j=40, <3j=30, <7j=20, <30j=10, sinon=0
 * - Open rate : avg_open_rate (0..1) × 40 (push_log.opened_at / sent)
 * - Streak : min(streak, 20)  — plafonné à 20
 */
export function computeScore(args: {
  lastActive: Date | null
  avgOpenRate: number
  streak: number
}): number {
  const now = Date.now()
  let recency = 0
  if (args.lastActive) {
    const daysAgo = (now - args.lastActive.getTime()) / 86_400_000
    if (daysAgo < 1) recency = 40
    else if (daysAgo < 3) recency = 30
    else if (daysAgo < 7) recency = 20
    else if (daysAgo < 30) recency = 10
  }
  const open = Math.min(Math.max(args.avgOpenRate, 0), 1) * 40
  const streak = Math.min(Math.max(args.streak, 0), 20)
  const total = Math.round(recency + open + streak)
  return Math.min(Math.max(total, 0), 100)
}

export function decideStyle(score: number): NotificationStyle {
  if (score >= 70) return 'informative'   // actif = info ciblée
  if (score >= 40) return 'encouraging'   // tiède = ré-énergise
  return 'warm'                           // inactif = chaleureux
}

export function decideFrequency(score: number): Frequency {
  if (score >= 70) return 'high'
  if (score >= 40) return 'normal'
  return 'low'
}

export function messagesPerWeek(freq: Frequency): number {
  if (freq === 'high') return 3
  if (freq === 'normal') return 2
  return 1
}

/**
 * Recalcule et persiste le profile pour un user donné.
 * Lit push_log (90j) pour avg_open_rate, profile pour last_active + streak.
 * Fire-and-forget côté appelant (idempotent, peut être re-run).
 */
export async function recomputeEngagement(userId: string): Promise<EngagementDecision> {
  const supa = createServiceClient()

  const { data: profile } = await supa
    .from('profiles')
    .select('updated_at, streak')
    .eq('id', userId)
    .maybeSingle()

  const lastActive = profile?.updated_at ? new Date(profile.updated_at) : null
  const streak = typeof profile?.streak === 'number' ? profile.streak : 0

  // push_log derniers 90j
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const { data: logs } = await supa
    .from('push_log')
    .select('opened_at, failed')
    .eq('user_id', userId)
    .eq('failed', false)
    .gte('sent_at', since)

  const total = logs?.length || 0
  const opened = logs?.filter((l) => l.opened_at).length || 0
  const avgOpenRate = total > 0 ? opened / total : 0

  const score = computeScore({ lastActive, avgOpenRate, streak })
  const style = decideStyle(score)
  const freq = decideFrequency(score)

  await supa
    .from('user_notification_profile')
    .upsert(
      {
        user_id: userId,
        engagement_score: score,
        notification_style: style,
        avg_open_rate: avgOpenRate,
        last_active: lastActive ? lastActive.toISOString() : null,
      },
      { onConflict: 'user_id' },
    )

  return { score, style, messagesPerWeek: messagesPerWeek(freq) }
}

/**
 * Template de contenu adaptatif selon style (1 message/type/style).
 * Kept simple : 3 tons × 6 types = 18 messages courts, inline.
 */
export function buildDailyContent(args: {
  type: 'daily'
  style: NotificationStyle
  firstName: string
}): { title: string; body: string; url: string } {
  const name = args.firstName || 'Pilote'
  const messages = {
    informative: {
      title: `Ta journée YANA, ${name}`,
      body: 'Ton tableau de bord est prêt : score, trajets, forêt, récompenses.',
    },
    encouraging: {
      title: `On y retourne, ${name} ?`,
      body: '3 minutes suffisent pour relancer ton streak et ta récompense du jour.',
    },
    warm: {
      title: `On pense à toi, ${name}`,
      body: 'Ton espace est là, prêt dès que tu en as envie. Aucune pression.',
    },
  }
  const m = messages[args.style]
  return { title: m.title, body: m.body, url: '/dashboard' }
}
