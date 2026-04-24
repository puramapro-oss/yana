// YANA Service Worker — Web Push (VAPID) only.
// Scope racine /. Versionné pour cache-bust.

const SW_VERSION = 'yana-push-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch (_e) {
    payload = { title: 'YANA', body: event.data.text() }
  }

  const title = payload.title || 'YANA'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    data: {
      url: payload.url || '/dashboard',
      type: payload.type || 'daily',
      logId: payload.logId || null,
    },
    tag: payload.type || 'yana',
    renotify: false,
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const targetUrl = data.url || '/dashboard'
  const logId = data.logId

  event.waitUntil(
    (async () => {
      if (logId) {
        try {
          await fetch('/api/push/opened', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logId }),
            keepalive: true,
          })
        } catch (_e) {
          // best-effort
        }
      }

      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of allClients) {
        try {
          const url = new URL(client.url)
          if (url.pathname === targetUrl && 'focus' in client) {
            return client.focus()
          }
        } catch (_e) {}
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    })(),
  )
})

// Permet au client de déclencher skipWaiting depuis la page.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
