'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { KycVerification } from '@/types'

export type ResolvedKycStatus = 'none' | 'pending' | 'processing' | 'approved' | 'rejected' | 'expired'

interface UseKycState {
  verification: KycVerification | null
  status: ResolvedKycStatus
  loading: boolean
  error: string | null
}

const INITIAL: UseKycState = {
  verification: null,
  status: 'none',
  loading: true,
  error: null,
}

export function useKyc() {
  const { user, profile, refetch: refetchProfile } = useAuth()
  const [state, setState] = useState<UseKycState>(INITIAL)
  const supabase = createClient()

  const fetchLatest = useCallback(async () => {
    if (!user) {
      setState({ ...INITIAL, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    const { data, error } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<KycVerification>()

    if (error) {
      setState({
        verification: null,
        status: 'none',
        loading: false,
        error: 'Impossible de charger ton statut de vérification.',
      })
      return
    }

    setState({
      verification: data ?? null,
      status: data ? (data.status as ResolvedKycStatus) : 'none',
      loading: false,
      error: null,
    })
  }, [user, supabase])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  const isApproved = state.status === 'approved' || profile?.onfido_status === 'approved'

  const start = useCallback(
    async (): Promise<{ fallback_reason?: string; error: string | null }> => {
      const res = await fetch('/api/kyc/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trigger: 'carpool_first_booking' }),
      })
      const payload = await res.json().catch(() => ({}))
      await fetchLatest()
      if (!res.ok) return { error: payload.error ?? 'Démarrage KYC impossible.' }
      return { error: null, fallback_reason: payload.fallback_reason }
    },
    [fetchLatest],
  )

  const simulateApprove = useCallback(async (): Promise<{ error: string | null }> => {
    const res = await fetch('/api/kyc/simulate', { method: 'POST' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) return { error: payload.error ?? 'Simulation impossible.' }
    await Promise.all([fetchLatest(), refetchProfile()])
    return { error: null }
  }, [fetchLatest, refetchProfile])

  return {
    ...state,
    isApproved,
    start,
    simulateApprove,
    refetch: fetchLatest,
  }
}
