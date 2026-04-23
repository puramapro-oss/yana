'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ticket } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import TicketCounter from '@/components/lottery/TicketCounter'
import NextDrawCard from '@/components/lottery/NextDrawCard'
import PastDrawsList from '@/components/lottery/PastDrawsList'
import TicketSourcesGuide from '@/components/lottery/TicketSourcesGuide'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'

interface TicketBreakdown {
  signup: number
  referral: number
  mission: number
  share: number
  review: number
  challenge: number
  streak: number
  subscription: number
  points_purchase: number
  daily: number
}

interface PastWinner {
  rank: number
  display_name: string
  amount_cents: number
}

interface LotteryStatus {
  totalTickets: number
  breakdown: TicketBreakdown
  nextDraw: {
    id: string
    period_start: string
    period_end: string
    pool_cents: number
    max_winners: number
    status: string
  } | null
  pastDraws: Array<{
    id: string
    period_start: string
    period_end: string
    pool_cents: number
    drawn_at: string | null
    winners: PastWinner[]
  }>
}

export default function LotteryPage() {
  const { loading: authLoading, user } = useAuth()
  const [data, setData] = useState<LotteryStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/lottery/status', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expirée. Reconnecte-toi.')
          setLoading(false)
          return
        }
        setError('Impossible de charger le tirage. Réessaie.')
        setLoading(false)
        return
      }
      const body: LotteryStatus = await res.json()
      setData(body)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchStatus()
  }, [user, fetchStatus])

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState message="Session expirée. Reconnecte-toi pour voir tes tickets." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <Ticket className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
          Tirage mensuel
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          10 gagnants sont tirés au sort chaque mois parmi les tickets actifs. La cagnotte correspond à 4 % du chiffre d&apos;affaires.
        </p>
      </header>

      {loading ? (
        <>
          <Skeleton className="h-32" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStatus} />
      ) : data ? (
        <>
          <TicketCounter total={data.totalTickets} breakdown={data.breakdown} />

          <NextDrawCard draw={data.nextDraw} />

          <section aria-labelledby="sources-title" className="glass rounded-2xl p-5 sm:p-6">
            <div id="sources-title" className="sr-only">Sources de tickets</div>
            <TicketSourcesGuide />
          </section>

          <section aria-labelledby="past-draws-title" className="glass rounded-2xl p-5 sm:p-6">
            <h2 id="past-draws-title" className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
              Tirages passés
            </h2>
            <PastDrawsList draws={data.pastDraws} />
          </section>
        </>
      ) : null}
    </div>
  )
}
