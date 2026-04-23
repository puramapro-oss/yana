'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AchievementCard, { type AchievementCardItem } from '@/components/achievements/AchievementCard'
import XPLevelBar from '@/components/achievements/XPLevelBar'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'

interface Stats {
  unlockedCount: number
  totalCount: number
  totalXpFromUnlocks: number
  profileXp: number
  profileLevel: number
  profilePoints: number
}

interface AchievementsResponse {
  achievements: AchievementCardItem[]
  stats: Stats
}

type Filter = 'all' | 'unlocked' | 'locked'

export default function AchievementsPage() {
  const { loading: authLoading, user } = useAuth()
  const [data, setData] = useState<AchievementsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/achievements/status', { cache: 'no-store' })
      if (!res.ok) {
        setError('Impossible de charger tes achievements. Réessaie.')
        setLoading(false)
        return
      }
      const body: AchievementsResponse = await res.json()
      setData(body)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchData()
  }, [user, fetchData])

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState message="Session expirée. Reconnecte-toi pour voir tes achievements." />
      </div>
    )
  }

  const filtered = data?.achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked
    if (filter === 'locked') return !a.unlocked
    return true
  }) ?? []

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <Award className="h-8 w-8 text-amber-300 sm:h-10 sm:w-10" />
          Achievements
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Tes trophées gagnés en roulant safe, en parrainant, et en plantant des forêts.
        </p>
      </header>

      {loading ? (
        <>
          <Skeleton className="h-36" />
          <Skeleton className="h-96" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : data ? (
        <>
          <XPLevelBar
            level={data.stats.profileLevel}
            xp={data.stats.profileXp}
            points={data.stats.profilePoints}
            unlockedCount={data.stats.unlockedCount}
            totalCount={data.stats.totalCount}
          />

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les achievements">
            {([
              { key: 'all', label: `Tous · ${data.stats.totalCount}` },
              { key: 'unlocked', label: `Débloqués · ${data.stats.unlockedCount}` },
              { key: 'locked', label: `À débloquer · ${data.stats.totalCount - data.stats.unlockedCount}` },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={
                  filter === key
                    ? 'rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-4 py-2 text-xs font-medium text-white'
                    : 'rounded-full border border-[var(--border)] bg-white/[0.02] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
                data-testid={`filter-${key}`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Award size={32} />}
              title={filter === 'unlocked' ? 'Aucun achievement débloqué' : 'Tout est déjà débloqué'}
              description={filter === 'unlocked'
                ? 'Lance ton premier trajet safe ou invite un·e ami·e pour commencer.'
                : 'Bravo ! Tu as tout complété.'}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <AchievementCard key={a.id} item={a} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
