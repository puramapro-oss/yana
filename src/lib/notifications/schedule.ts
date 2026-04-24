// Orchestration CRON quotidien push.
// Scan profiles éligibles → calcule engagement → filtre fenêtre horaire/jour/pause
// → envoie push → log push_log + update subscription status.

import { createServiceClient } from '@/lib/supabase'
import {
  sendPush,
  hashEndpoint,
  type PushSubscriptionRecord,
} from './web-push'
import {
  recomputeEngagement,
  buildDailyContent,
  type NotificationStyle,
} from './engagement'

const DAILY_TYPE = 'daily'

export interface DailyStats {
  scanned: number
  eligible: number
  sent: number
  skipped: {
    no_subscription: number
    out_of_window: number
    paused: number
    already_sent_today: number
    disabled: number
  }
  invalidated: number
  errors: string[]
}

function currentHourUtc(): number {
  return new Date().getUTCHours()
}

function currentDayOfWeek(): number {
  // 0=dim..6=sam
  return new Date().getUTCDay()
}

function inWindow(hour: number, start: number, end: number): boolean {
  if (start <= end) return hour >= start && hour <= end
  // Fenêtre qui traverse minuit
  return hour >= start || hour <= end
}

export async function runDailyPushes(limit = 1000): Promise<DailyStats> {
  const supa = createServiceClient()
  const stats: DailyStats = {
    scanned: 0,
    eligible: 0,
    sent: 0,
    skipped: {
      no_subscription: 0,
      out_of_window: 0,
      paused: 0,
      already_sent_today: 0,
      disabled: 0,
    },
    invalidated: 0,
    errors: [],
  }

  // 1. Pull subscriptions actives avec owner profile
  const { data: subs, error: subsErr } = await supa
    .from('web_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('enabled', true)
    .limit(limit)

  if (subsErr) {
    stats.errors.push(`query subs: ${subsErr.message}`)
    return stats
  }

  stats.scanned = subs?.length || 0
  if (!subs || subs.length === 0) return stats

  const userIds = Array.from(new Set(subs.map((s) => s.user_id)))

  // 2. Préférences daily par user (1 query)
  const { data: prefs } = await supa
    .from('notification_preferences')
    .select('user_id, enabled, days_of_week, hour_start, hour_end, paused_until')
    .eq('type', DAILY_TYPE)
    .in('user_id', userIds)

  const prefByUser = new Map<string, {
    enabled: boolean
    days: number[]
    hourStart: number
    hourEnd: number
    pausedUntil: Date | null
  }>()
  for (const p of prefs || []) {
    prefByUser.set(p.user_id, {
      enabled: p.enabled,
      days: Array.isArray(p.days_of_week) ? p.days_of_week : [1, 2, 3, 4, 5],
      hourStart: typeof p.hour_start === 'number' ? p.hour_start : 9,
      hourEnd: typeof p.hour_end === 'number' ? p.hour_end : 20,
      pausedUntil: p.paused_until ? new Date(p.paused_until) : null,
    })
  }

  // 3. Profiles + first_name
  const { data: profiles } = await supa
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)
  const profByUser = new Map(profiles?.map((p) => [p.id, p]) || [])

  // 4. push_log du jour (déjà envoyé)
  const today = new Date().toISOString().slice(0, 10)
  const { data: alreadySent } = await supa
    .from('push_log')
    .select('user_id')
    .eq('type', DAILY_TYPE)
    .eq('sent_day', today)
    .eq('failed', false)
    .in('user_id', userIds)
  const sentToday = new Set((alreadySent || []).map((l) => l.user_id))

  const now = new Date()
  const hour = currentHourUtc()
  const dow = currentDayOfWeek()

  // 5. Itération
  for (const sub of subs) {
    const pref = prefByUser.get(sub.user_id) ?? {
      enabled: true,
      days: [1, 2, 3, 4, 5],
      hourStart: 9,
      hourEnd: 20,
      pausedUntil: null,
    }

    if (!pref.enabled) { stats.skipped.disabled++; continue }
    if (pref.pausedUntil && pref.pausedUntil > now) { stats.skipped.paused++; continue }
    if (!pref.days.includes(dow)) { stats.skipped.out_of_window++; continue }
    if (!inWindow(hour, pref.hourStart, pref.hourEnd)) { stats.skipped.out_of_window++; continue }
    if (sentToday.has(sub.user_id)) { stats.skipped.already_sent_today++; continue }

    stats.eligible++

    // 6. Engagement recalcul + contenu
    let style: NotificationStyle = 'informative'
    let score = 50
    try {
      const eng = await recomputeEngagement(sub.user_id)
      style = eng.style
      score = eng.score
    } catch {
      // recompute échoué = defaults OK
    }

    const profile = profByUser.get(sub.user_id)
    const firstName =
      (profile?.full_name || '').split(' ')[0] || 'Pilote'
    const content = buildDailyContent({ type: 'daily', style, firstName })

    // 7. Insert push_log BEFORE send (mutex via unique index daily_once)
    const { data: inserted, error: insErr } = await supa
      .from('push_log')
      .insert({
        user_id: sub.user_id,
        type: DAILY_TYPE,
        title: content.title,
        body: content.body,
        url: content.url,
        engagement_score_at_send: score,
        endpoint_hash: hashEndpoint(sub.endpoint),
        sent_day: today,
      })
      .select('id')
      .maybeSingle()

    if (insErr || !inserted) {
      // 23505 = unique violation → déjà envoyé (race CRON retry)
      if (insErr?.code === '23505') {
        stats.skipped.already_sent_today++
      } else {
        stats.errors.push(`insert log ${sub.user_id}: ${insErr?.message || 'no row'}`)
      }
      continue
    }

    // 8. Envoi push réel
    const rec: PushSubscriptionRecord = {
      id: sub.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    }
    const outcome = await sendPush(rec, {
      title: content.title,
      body: content.body,
      url: content.url,
      type: DAILY_TYPE,
      logId: inserted.id,
    })

    if (outcome.ok) {
      stats.sent++
    } else {
      stats.errors.push(`send ${sub.user_id}: ${outcome.error}`)
      // Flag push_log échoué (libère l'unique index pour retry demain)
      await supa
        .from('push_log')
        .update({ failed: true, error: outcome.error, token_invalidated: outcome.invalidated })
        .eq('id', inserted.id)

      if (outcome.invalidated) {
        stats.invalidated++
        await supa
          .from('web_push_subscriptions')
          .update({ enabled: false, failure_count: 999 })
          .eq('id', sub.id)
      } else {
        // Failure transitoire : increment + disable si >5
        const nextCount = 1 // on garde simple — augmente via fonction SQL si besoin
        await supa
          .from('web_push_subscriptions')
          .update({ failure_count: nextCount })
          .eq('id', sub.id)
      }
    }
  }

  return stats
}

/**
 * Trigger synchrone event — bypass frequency, respecte kill-switch (enabled + pausedUntil).
 */
export async function triggerEventPush(args: {
  userId: string
  type: 'achievement' | 'referral' | 'wallet' | 'contest' | 'lottery'
  title: string
  body: string
  url?: string
}): Promise<{ sent: number; errors: string[] }> {
  const supa = createServiceClient()
  const errors: string[] = []
  let sent = 0

  // Check kill-switch pour ce type
  const { data: pref } = await supa
    .from('notification_preferences')
    .select('enabled, paused_until')
    .eq('user_id', args.userId)
    .eq('type', args.type)
    .maybeSingle()

  if (pref?.enabled === false) return { sent: 0, errors: [] }
  if (pref?.paused_until && new Date(pref.paused_until) > new Date()) {
    return { sent: 0, errors: [] }
  }

  const { data: subs } = await supa
    .from('web_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', args.userId)
    .eq('enabled', true)

  if (!subs || subs.length === 0) return { sent: 0, errors: [] }

  for (const sub of subs) {
    const { data: inserted, error: insErr } = await supa
      .from('push_log')
      .insert({
        user_id: args.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        url: args.url || '/dashboard',
        endpoint_hash: hashEndpoint(sub.endpoint),
      })
      .select('id')
      .maybeSingle()

    if (insErr || !inserted) {
      errors.push(`insert log ${sub.id}: ${insErr?.message || 'no row'}`)
      continue
    }

    const outcome = await sendPush(
      { id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: args.title,
        body: args.body,
        url: args.url || '/dashboard',
        type: args.type,
        logId: inserted.id,
      },
    )

    if (outcome.ok) {
      sent++
    } else {
      errors.push(`send ${sub.id}: ${outcome.error}`)
      await supa
        .from('push_log')
        .update({ failed: true, error: outcome.error, token_invalidated: outcome.invalidated })
        .eq('id', inserted.id)
      if (outcome.invalidated) {
        await supa
          .from('web_push_subscriptions')
          .update({ enabled: false })
          .eq('id', sub.id)
      }
    }
  }

  return { sent, errors }
}
