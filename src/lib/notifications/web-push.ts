// Client web-push lazy singleton + VAPID setup + sendPush wrapper.
// Gère les codes HTTP Push Service : 410/404 = subscription morte → invalidate en DB.

import webpush from 'web-push'
import { createHash } from 'node:crypto'

let configured = false

function configure(): void {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@purama.dev'
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquants')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  type: string
  logId?: string
  icon?: string
  badge?: string
}

export interface PushSubscriptionRecord {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export type SendPushOutcome =
  | { ok: true }
  | { ok: false; invalidated: boolean; status?: number; error: string }

export async function sendPush(
  sub: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<SendPushOutcome> {
  configure()
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    type: payload.type,
    logId: payload.logId,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-96.png',
  })

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      body,
      { TTL: 86400, urgency: 'normal' },
    )
    return { ok: true }
  } catch (err) {
    const e = err as { statusCode?: number; body?: string; message?: string }
    const status = typeof e.statusCode === 'number' ? e.statusCode : undefined
    // 404 / 410 = subscription définitivement morte → à supprimer
    const invalidated = status === 404 || status === 410
    return {
      ok: false,
      invalidated,
      status,
      error: e.message || e.body || 'sendPush failed',
    }
  }
}

export function hashEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 16)
}

export function getVapidPublicKey(): string {
  const k = process.env.VAPID_PUBLIC_KEY
  if (!k) throw new Error('VAPID_PUBLIC_KEY manquant')
  return k
}
