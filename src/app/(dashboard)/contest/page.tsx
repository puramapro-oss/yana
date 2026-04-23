'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Countdown from '@/components/contest/Countdown'
import LeaderboardTable from '@/components/contest/LeaderboardTable'
import PastResultsList from '@/components/contest/PastResultsList'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'

interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  referrals: number
  missions: number
  rank: number
}

interface LeaderboardResponse {
  periodStart: string
  periodEnd: string
  leaderboard: LeaderboardEntry[]
  participantCount: number
}

interface WinnerEntry {
  user_id: string
  display_name: string
  rank: number
  amount_cents: number
  score?: number
}

interface PastResult {
  id: string
  period_type: string
  period_start: string
  period_end: string
  total_pool_cents: number
  winners: WinnerEntry[]
}

export default function ContestPage() {
  const { loading: authLoading, user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [history, setHistory] = useState<PastResult[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [lbRes, histRes] = await Promise.all([
        fetch('/api/contest/leaderboard', { cache: 'no-store' }),
        fetch('/api/contest/history?period=weekly&limit=6', { cache: 'no-store' }),
      ])
      if (!lbRes.ok) {
        setError('Impossible de charger le classement. Réessaie.')
        setLoading(false)
        return
      }
      const lbData: LeaderboardResponse = await lbRes.json()
      const histData = histRes.ok ? await histRes.json() : { history: [] }
      setLeaderboard(lbData)
      setHistory(histData.history ?? [])
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchAll()
  }, [user, fetchAll])

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState message="Session expirée. Reconnecte-toi pour voir le classement." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <Trophy className="h-8 w-8 text-amber-300 sm:h-10 sm:w-10" />
          Classement hebdomadaire
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Les 10 meilleurs scores de la semaine se partagent 6 % du chiffre d&apos;affaires. Reset
          chaque dimanche à minuit.
        </p>
      </header>

      {loading ? (
        <>
          <Skeleton className="h-24" />
          <Skeleton className="h-72" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAll} />
      ) : leaderboard ? (
        <>
          <section className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Countdown target={leaderboard.periodEnd} label="Fin du classement" />
              <div className="text-sm text-[var(--text-secondary)]">
                <p>
                  <strong className="text-[var(--text-primary)]">{leaderboard.participantCount}</strong>{' '}
                  participant{leaderboard.participantCount > 1 ? 's' : ''} actif{leaderboard.participantCount > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Score = parrainages × 10 + missions × 3
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="leaderboard-title" className="glass rounded-2xl p-5 sm:p-6">
            <h2 id="leaderboard-title" className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
              Top 10 cette semaine
            </h2>
            <LeaderboardTable entries={leaderboard.leaderboard} currentUserId={user.id} />
          </section>

          <section aria-labelledby="history-title" className="glass rounded-2xl p-5 sm:p-6">
            <h2 id="history-title" className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
              Palmarès passés
            </h2>
            <PastResultsList results={history ?? []} />
          </section>
        </>
      ) : null}
    </div>
  )
}
