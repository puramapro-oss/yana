'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { TreePlanted } from '@/types'

export interface TreesStats {
  co2_offset_total_kg: number
  trees_planted_total: number
  trees_available_to_claim: number
  kg_to_next_tree: number
  total_trips: number
  total_distance_km: number
}

interface UseTreesState {
  trees: TreePlanted[]
  stats: TreesStats | null
  loading: boolean
  error: string | null
}

const INITIAL: UseTreesState = {
  trees: [],
  stats: null,
  loading: true,
  error: null,
}

export function useTrees() {
  const { user } = useAuth()
  const [state, setState] = useState<UseTreesState>(INITIAL)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setState({ ...INITIAL, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/trees/list')
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState({
          trees: [],
          stats: null,
          loading: false,
          error: payload.error ?? 'Impossible de charger ta forêt.',
        })
        return
      }
      setState({
        trees: (payload.trees ?? []) as TreePlanted[],
        stats: (payload.stats ?? null) as TreesStats | null,
        loading: false,
        error: null,
      })
    } catch {
      setState({
        trees: [],
        stats: null,
        loading: false,
        error: 'Connexion impossible. Vérifie ton réseau.',
      })
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const claimTree = useCallback(async (): Promise<{ error: string | null }> => {
    const res = await fetch('/api/trees/plant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) return { error: payload.error ?? 'Plantation impossible.' }
    await fetchAll()
    return { error: null }
  }, [fetchAll])

  return {
    ...state,
    claimTree,
    refetch: fetchAll,
  }
}
