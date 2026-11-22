import { useEffect, useState } from 'react'
import type { SubscriptionResponse } from './types'

export function useSubscriptionStatus() {
  const [data, setData] = useState<SubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readVersion, setReadVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    fetch('/api/subscription', { cache: 'no-store', signal })
      .then(res => {
        if (signal.aborted) return null
        if (!res.ok) {
          setError('Impossible de charger ton abonnement. Réessaie.')
          return null
        }
        return res.json() as Promise<SubscriptionResponse>
      })
      .then(body => { if (!signal.aborted && body) setData(body) })
      .catch(() => { if (!signal.aborted) setError('Erreur réseau. Vérifie ta connexion.') })
      .finally(() => { if (!signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [readVersion])

  function retryStatus() {
    setLoading(true)
    setError(null)
    setReadVersion(version => version + 1)
  }

  return { data, loading, error, retryStatus }
}
