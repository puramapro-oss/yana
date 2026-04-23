'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface WalletState {
  balanceCents: number
  points: number
  seeds: number
  co2OffsetKg: number
  treesPlantedTotal: number
  loading: boolean
}

const INITIAL_STATE: WalletState = {
  balanceCents: 0,
  points: 0,
  seeds: 0,
  co2OffsetKg: 0,
  treesPlantedTotal: 0,
  loading: true,
}

export function useWallet() {
  const { user, profile } = useAuth()
  const [state, setState] = useState<WalletState>(INITIAL_STATE)
  const supabase = createClient()

  const fetchWallet = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select(
        'wallet_balance_cents, purama_points, seeds_balance, co2_offset_total_kg, trees_planted_total',
      )
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setState({
        balanceCents: Number(data.wallet_balance_cents ?? 0),
        points: Number(data.purama_points ?? 0),
        seeds: Number(data.seeds_balance ?? 0),
        co2OffsetKg: Number(data.co2_offset_total_kg ?? 0),
        treesPlantedTotal: Number(data.trees_planted_total ?? 0),
        loading: false,
      })
    } else {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [user, supabase])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  // Sync with profile updates (faster feedback than refetching)
  useEffect(() => {
    if (profile) {
      setState({
        balanceCents: Number(profile.wallet_balance_cents ?? 0),
        points: Number(profile.purama_points ?? 0),
        seeds: Number(profile.seeds_balance ?? 0),
        co2OffsetKg: Number(profile.co2_offset_total_kg ?? 0),
        treesPlantedTotal: Number(profile.trees_planted_total ?? 0),
        loading: false,
      })
    }
  }, [profile])

  const balanceEur = state.balanceCents / 100

  return { ...state, balanceEur, refetch: fetchWallet }
}
