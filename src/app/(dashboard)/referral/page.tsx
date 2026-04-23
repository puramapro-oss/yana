'use client'

import { useMemo } from 'react'
import { Gift, TrendingUp, Users, Wallet } from 'lucide-react'
import { useReferral } from '@/hooks/useReferral'
import { useAuth } from '@/hooks/useAuth'
import ReferralCard from '@/components/referral/ReferralCard'
import ReferralList from '@/components/referral/ReferralList'
import TierProgress from '@/components/referral/TierProgress'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import { formatPrice } from '@/lib/utils'

export default function ReferralDashboardPage() {
  const { loading: authLoading, user } = useAuth()
  const { referralLink, referralCode, stats, loading, error, refetch } = useReferral()

  const totalGenerated = useMemo(
    () => stats.commissionCentsPending + stats.commissionCentsCredited + stats.commissionCentsPaidOut,
    [stats],
  )

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState message="Session expirée. Reconnecte-toi pour accéder à tes parrainages." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      {/* Header */}
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Parrainage
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Partage YANA. Gagne 50 % du premier paiement de chaque filleul + 10 % à vie.
        </p>
      </header>

      {/* Loading skeleton — la card code ne dépend pas de stats, on peut l'afficher */}
      <ReferralCard link={referralLink} code={referralCode} />

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <section aria-labelledby="stats-title" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <h2 id="stats-title" className="sr-only">Statistiques</h2>
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Filleuls directs"
              value={<AnimatedCounter value={stats.n1Count} />}
              sub={`${stats.n2Count} N2 · ${stats.n3Count} N3`}
              data-testid="stat-n1"
            />
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label="Commissions créditées"
              value={<AnimatedCounter value={stats.commissionCentsCredited / 100} prefix="" suffix=" €" decimals={2} />}
              sub={`${formatPrice(stats.commissionCentsPaidOut)} versés`}
              data-testid="stat-credited"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="En attente"
              value={<AnimatedCounter value={stats.commissionCentsPending / 100} prefix="" suffix=" €" decimals={2} />}
              sub="Validation abonnement"
              data-testid="stat-pending"
            />
            <StatCard
              icon={<Gift className="h-5 w-5" />}
              label="Généré au total"
              value={<AnimatedCounter value={totalGenerated / 100} prefix="" suffix=" €" decimals={2} />}
              sub="Depuis ton inscription"
              data-testid="stat-total"
            />
          </section>

          {/* Tier progress */}
          <TierProgress currentTier={stats.tier} currentCount={stats.n1Count} />

          {/* Liste filleuls */}
          <section aria-labelledby="list-title" className="glass rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="list-title" className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Tes derniers filleuls
              </h2>
              {stats.latest.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {stats.latest.length} affiché{stats.latest.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ReferralList items={stats.latest} />
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  ...rest
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="glass rounded-2xl p-4" {...rest}>
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  )
}
