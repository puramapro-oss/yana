// schedule.ts — décide quel email envoyer à qui, quand.
// Appelé par /api/cron/emails/daily (scan users) ou directement (event trigger).

import { createServiceClient } from '@/lib/supabase'
import { sendTemplate, type SendTemplateResult } from './resend'

// Ordre des emails daily selon le temps depuis signup.
// Un user qui passe J14 sans avoir reçu J0 peut encore le recevoir plus tard
// (mais voir acceptanceWindow pour limiter les retards trop importants).
const DAILY_SEQUENCE = [
  { type: 'welcome_d0', offset: 0 },
  { type: 'tip_d1', offset: 1 },
  { type: 'relance_d3', offset: 3 },
  { type: 'tips_d7', offset: 7 },
  { type: 'upgrade_d14', offset: 14 },
  { type: 'testimonial_d21', offset: 21 },
  { type: 'winback_d30', offset: 30 },
] as const

// Fenêtre d'acceptation : un mail J7 n'est plus envoyé si > 14j passés sans l'avoir reçu.
// Évite de bombarder un user qui revient après 6 mois.
const ACCEPTANCE_WINDOW_DAYS = 7

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Trouve le template daily approprié pour un user selon son âge compte
 * et les emails déjà envoyés. Retourne null si aucun à envoyer maintenant.
 */
export function pickDailyTemplateForAge(
  ageDays: number,
  alreadySent: Set<string>,
): (typeof DAILY_SEQUENCE)[number] | null {
  // Parcours dans l'ordre inverse : on cherche le plus récent qui correspond
  // à l'âge du user et qui n'a pas encore été envoyé.
  for (let i = DAILY_SEQUENCE.length - 1; i >= 0; i--) {
    const step = DAILY_SEQUENCE[i]
    const delta = ageDays - step.offset
    if (delta < 0) continue // trop tôt
    if (delta > ACCEPTANCE_WINDOW_DAYS) continue // trop tard, skip
    if (alreadySent.has(step.type)) continue // déjà envoyé
    return step
  }
  return null
}

export interface DailyRunStats {
  scanned: number
  eligible: number
  sent: number
  skipped: { unsubscribed: number; already_sent: number; no_email: number; send_failed: number }
  errors: Array<{ user_id: string; reason: string; detail?: string }>
}

/**
 * CRON quotidien : scanne tous les users actifs, sélectionne le template
 * daily approprié selon leur âge compte, et l'envoie via sendTemplate.
 * Idempotence garantie par email_sequences unique index.
 */
export async function runDailyEmails(limit = 1000): Promise<DailyRunStats> {
  const supa = createServiceClient()
  const stats: DailyRunStats = {
    scanned: 0,
    eligible: 0,
    sent: 0,
    skipped: { unsubscribed: 0, already_sent: 0, no_email: 0, send_failed: 0 },
    errors: [],
  }

  // on ne scanne que les profils dont le compte a entre 0 et 37j
  // (30 + ACCEPTANCE_WINDOW_DAYS). Au-delà, winback_d30 est la dernière
  // opportunité et après on stoppe tout.
  const now = new Date()
  const oldest = new Date(now.getTime() - (30 + ACCEPTANCE_WINDOW_DAYS) * 86_400_000)

  const { data: profiles, error } = await supa
    .from('profiles')
    .select('id, email, created_at')
    .gte('created_at', oldest.toISOString())
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !profiles) return stats

  stats.scanned = profiles.length

  // precharge des sequences envoyées pour éviter N requêtes séparées
  const ids = profiles.map((p) => p.id)
  const { data: sentRows } = await supa
    .from('email_sequences')
    .select('user_id, template_type')
    .in('user_id', ids)
    .is('context_ref', null)
    .is('error', null)

  const sentMap = new Map<string, Set<string>>()
  for (const row of sentRows ?? []) {
    if (!sentMap.has(row.user_id)) sentMap.set(row.user_id, new Set())
    sentMap.get(row.user_id)!.add(row.template_type)
  }

  for (const p of profiles) {
    const created = new Date(p.created_at as string)
    const age = daysBetween(created, now)
    const picked = pickDailyTemplateForAge(age, sentMap.get(p.id) ?? new Set())
    if (!picked) continue
    stats.eligible++

    const result: SendTemplateResult = await sendTemplate({
      userId: p.id,
      type: picked.type,
    })
    if (result.ok) {
      stats.sent++
    } else {
      if (result.reason in stats.skipped) {
        stats.skipped[result.reason as keyof typeof stats.skipped]++
      }
      if (result.reason === 'send_failed' || result.reason === 'template_missing') {
        stats.errors.push({ user_id: p.id, reason: result.reason, detail: result.detail })
      }
    }
  }

  return stats
}

// -------------------------------------------------------- events synchrones --
//
// Ces helpers sont appelés inline (pas via CRON) depuis les flows concernés.
// Ex : dans /api/stripe/webhook après customer.subscription.created → triggerPalierReached.

export async function triggerReferralMilestone(
  userId: string,
  paliers: { code: string; name: string },
): Promise<SendTemplateResult> {
  return sendTemplate({
    userId,
    type: 'event_referral_milestone',
    vars: { palier_name: paliers.name },
    contextRef: paliers.code,
  })
}

export async function triggerContestWon(
  userId: string,
  contest: { periodRef: string; rank: number; amountCents: number },
): Promise<SendTemplateResult> {
  const amount = (contest.amountCents / 100).toFixed(2).replace('.00', '')
  return sendTemplate({
    userId,
    type: 'event_contest_won',
    vars: { rank: String(contest.rank), amount },
    contextRef: contest.periodRef,
  })
}

export async function triggerTierReached(
  userId: string,
  tier: { level: number },
): Promise<SendTemplateResult> {
  return sendTemplate({
    userId,
    type: 'event_tier_reached',
    vars: { level: String(tier.level) },
    contextRef: `level:${tier.level}`,
  })
}
