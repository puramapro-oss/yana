'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { APP_DOMAIN } from '@/lib/constants'
import type { Referral, Commission } from '@/types'

export type ReferralTier = 'debutant' | 'bronze' | 'argent' | 'or' | 'platine' | 'diamant' | 'legende'

interface ReferralStats {
  n1Count: number
  n2Count: number
  n3Count: number
  totalCount: number
  commissionCentsPending: number
  commissionCentsCredited: number
  commissionCentsPaidOut: number
  tier: ReferralTier
  nextTier: { tier: ReferralTier; threshold: number } | null
  latest: Array<Referral & { referred_full_name: string | null; referred_email: string | null }>
  latestCommissions: Commission[]
}

const INITIAL_STATS: ReferralStats = {
  n1Count: 0,
  n2Count: 0,
  n3Count: 0,
  totalCount: 0,
  commissionCentsPending: 0,
  commissionCentsCredited: 0,
  commissionCentsPaidOut: 0,
  tier: 'debutant',
  nextTier: { tier: 'bronze', threshold: 5 },
  latest: [],
  latestCommissions: [],
}

export function useReferral() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<ReferralStats>(INITIAL_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const referralLink = profile?.referral_code
    ? `https://${APP_DOMAIN}/go/${profile.referral_code}`
    : ''
  const referralCode = profile?.referral_code ?? ''

  const fetchStats = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false)
      return
    }
    setError(null)
    try {
      const response = await fetch('/api/referral/stats', {
        credentials: 'same-origin',
      })
      if (!response.ok) {
        throw new Error('network')
      }
      const data = (await response.json()) as ReferralStats
      setStats(data)
    } catch {
      setError('Impossible de charger tes statistiques pour le moment. Réessaie dans quelques secondes.')
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    referralLink,
    referralCode,
    loading,
    error,
    stats,
    refetch: fetchStats,
    // Backwards compat pour usages existants
    referralCount: stats.totalCount,
    tier: stats.tier,
  }
}
