import { useCallback, useEffect, useState } from 'react'
import { apiVehiclesList, type VehicleRow } from '@/lib/trip-api'

export function useVehicles() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const list = await apiVehiclesList()
      setVehicles(list)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const primary = vehicles.find((v) => v.is_primary) ?? vehicles[0] ?? null

  return { vehicles, primary, loading, error, refresh }
}
