import { useEffect, useRef, useState } from 'react'

export function useSubscriptionPortal() {
  const [opening, setOpening] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const portalRequest = useRef<AbortController | null>(null)

  useEffect(() => () => {
    portalRequest.current?.abort()
    portalRequest.current = null
  }, [])

  async function openPortal() {
    if (portalRequest.current) return
    const controller = new AbortController()
    portalRequest.current = controller
    const current = () => portalRequest.current === controller && !controller.signal.aborted
    setOpening(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', signal: controller.signal })
      if (!current()) return
      const body = await res.json()
      if (!current()) return
      if (!res.ok || !body.url) {
        setPortalError(body.error ?? 'Impossible d\'ouvrir le portail Stripe.')
        return
      }
      window.location.href = body.url
    } catch {
      if (current()) setPortalError('Erreur réseau. Réessaie.')
    } finally {
      if (portalRequest.current === controller) {
        portalRequest.current = null
        setOpening(false)
      }
    }
  }

  return { opening, portalError, openPortal }
}
