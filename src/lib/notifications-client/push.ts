// Helpers browser — enregistrement SW + subscribe/unsubscribe Web Push API.
// Pur client (pas Node-only). Gère Safari iOS < 16.4 gracieusement.

export interface PushCapability {
  supported: boolean
  reason?: 'no_sw' | 'no_push' | 'no_notification'
}

export function detectCapability(): PushCapability {
  if (typeof window === 'undefined') return { supported: false, reason: 'no_sw' }
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'no_sw' }
  if (!('PushManager' in window)) return { supported: false, reason: 'no_push' }
  if (!('Notification' in window)) return { supported: false, reason: 'no_notification' }
  return { supported: true }
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js')
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

function urlB64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/push/vapid-public-key', { cache: 'no-store' })
  if (!res.ok) throw new Error('vapid_not_configured')
  const json = (await res.json()) as { publicKey?: string }
  if (!json.publicKey) throw new Error('vapid_missing_key')
  return json.publicKey
}

export interface SubscribeResult {
  ok: boolean
  reason?: 'denied' | 'unsupported' | 'error'
  detail?: string
}

export async function subscribeToPush(): Promise<SubscribeResult> {
  const cap = detectCapability()
  if (!cap.supported) return { ok: false, reason: 'unsupported' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'denied' }

  try {
    const registration = await registerServiceWorker()
    await navigator.serviceWorker.ready

    // Re-subscribe propre : récupère l'abo existant ou en crée un nouveau
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const publicKey = await fetchVapidPublicKey()
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToArrayBuffer(publicKey),
      })
    }

    const json = subscription.toJSON()
    const payload = {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
      userAgent: navigator.userAgent,
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, reason: 'error', detail: txt.slice(0, 200) }
    }

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'error', detail: msg }
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const registration = await registerServiceWorker()
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return { ok: true }

    const endpoint = subscription.endpoint

    await subscription.unsubscribe()

    const res = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, detail: txt.slice(0, 200) }
    }
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: msg }
  }
}

export async function isSubscribed(): Promise<boolean> {
  const cap = detectCapability()
  if (!cap.supported) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!registration) return false
    const sub = await registration.pushManager.getSubscription()
    return sub !== null
  } catch {
    return false
  }
}

export async function sendTestPush(): Promise<{ ok: boolean; sent?: number; detail?: string }> {
  const res = await fetch('/api/push/test', { method: 'POST' })
  if (!res.ok) {
    const txt = await res.text()
    return { ok: false, detail: txt.slice(0, 200) }
  }
  const json = (await res.json()) as { ok: boolean; sent?: number }
  return { ok: json.ok, sent: json.sent }
}
