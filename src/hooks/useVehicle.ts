'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Vehicle, VehicleType, FuelType } from '@/types'

export interface CreateVehicleInput {
  vehicle_type: VehicleType
  brand?: string | null
  model?: string | null
  year?: number | null
  fuel_type: FuelType
  is_primary?: boolean
}

interface UseVehicleState {
  vehicles: Vehicle[]
  loading: boolean
  error: string | null
}

export function useVehicle() {
  const { user } = useAuth()
  const [state, setState] = useState<UseVehicleState>({
    vehicles: [],
    loading: true,
    error: null,
  })
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    if (!user) {
      setState({ vehicles: [], loading: false, error: null })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setState({
        vehicles: [],
        loading: false,
        error: 'Impossible de charger tes véhicules. Réessaie.',
      })
      return
    }
    setState({ vehicles: (data ?? []) as Vehicle[], loading: false, error: null })
  }, [user, supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const create = useCallback(
    async (input: CreateVehicleInput): Promise<{ vehicle: Vehicle | null; error: string | null }> => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { vehicle: null, error: payload.error ?? 'Création impossible.' }
      }
      await fetchAll()
      return { vehicle: payload.vehicle as Vehicle, error: null }
    },
    [fetchAll],
  )

  const remove = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) return { error: payload.error ?? 'Suppression impossible.' }
      await fetchAll()
      return { error: null }
    },
    [fetchAll],
  )

  const setPrimary = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) return { error: payload.error ?? 'Mise à jour impossible.' }
      await fetchAll()
      return { error: null }
    },
    [fetchAll],
  )

  const primary = state.vehicles.find((v) => v.is_primary) ?? state.vehicles[0] ?? null

  return {
    vehicles: state.vehicles,
    primary,
    loading: state.loading,
    error: state.error,
    create,
    remove,
    setPrimary,
    refetch: fetchAll,
  }
}
