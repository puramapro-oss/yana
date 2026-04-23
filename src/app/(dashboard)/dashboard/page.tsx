'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Car, MessageSquare, Play, TreeDeciduous } from 'lucide-react'
import type { Trip } from '@/types'
import { formatDateTime } from '@/lib/utils'
import DailyGiftCard from '@/components/rewards/DailyGiftCard'
import AnniversaryBanner from '@/components/rewards/AnniversaryBanner'
import CrossPromoBanner from '@/components/crosspromo/CrossPromoBanner'
import AffirmationCard from '@/components/shared/AffirmationCard'

export default function DashboardPage() {
  const { profile, user, loading } = useAuth()
  const [recentTrips, setRecentTrips] = useState<Trip[] | null>(null)
  const [tripsLoading, setTripsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setTripsLoading(true)
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(5)
      if (!cancelled) {
        setRecentTrips((data ?? []) as Trip[])
        setTripsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cyan)] border-t-transparent" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'pilote'
  const avgSafety =
    profile && profile.total_trips > 0 && profile.total_safety_score != null
      ? Math.round(profile.total_safety_score / profile.total_trips)
      : null

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Bienvenue,</p>
          <h1 className="gradient-text font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
            {firstName} 🛞
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Chaque trajet est un chapitre de ta légende.
          </p>
        </div>
        <Link
          href="/drive"
          data-testid="dashboard-drive-cta"
          className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/20 transition hover:brightness-110 sm:inline-flex"
        >
          <Play className="h-4 w-4" />
          Démarrer
        </Link>
      </header>

      <div className="mb-6 flex flex-col gap-4">
        <AffirmationCard />
        <AnniversaryBanner />
        <DailyGiftCard />
      </div>

      <section
        aria-labelledby="dashboard-stats"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <h2 id="dashboard-stats" className="sr-only">
          Statistiques
        </h2>
        <Stat label="Trajets" value={String(profile?.total_trips ?? 0)} icon="🚗" />
        <Stat label="Km parcourus" value={formatKm(profile?.total_distance_km ?? 0)} icon="🛣️" />
        <Stat
          label="CO₂ compensé"
          value={`${Math.round(profile?.co2_offset_total_kg ?? 0)} kg`}
          icon="🌿"
        />
        <Stat
          label="Score sécurité"
          value={avgSafety != null ? `${avgSafety}/100` : '—'}
          icon="🛡️"
        />
      </section>

      <Link
        href="/drive"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/20 transition hover:brightness-110 sm:hidden"
      >
        <Play className="h-4 w-4" />
        Démarrer un trajet
      </Link>

      <section
        aria-labelledby="recent-trips"
        className="mt-10 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="recent-trips"
            className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]"
          >
            Derniers trajets
          </h2>
          <Link
            href="/vehicles"
            className="text-xs text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
          >
            Gérer véhicules
          </Link>
        </div>

        {tripsLoading && (
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </ul>
        )}

        {!tripsLoading && recentTrips && recentTrips.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Aucun trajet encore. Démarre ton premier trajet pour gagner tes premières Graines.
            </p>
            <Link
              href="/drive"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--cyan)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              <Play className="h-4 w-4" /> Démarrer
            </Link>
          </div>
        )}

        {!tripsLoading && recentTrips && recentTrips.length > 0 && (
          <ul className="space-y-2" data-testid="recent-trips-list">
            {recentTrips.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.01] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
                    <Car className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {Number(t.distance_km).toFixed(1)} km · {t.trip_mode === 'carpool_driver' ? 'Covoit conducteur' : t.trip_mode === 'carpool_passenger' ? 'Covoit passager' : 'Solo'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t.ended_at ? formatDateTime(t.ended_at) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <Badge score={t.safety_score} />
                  {t.seeds_earned > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      +{t.seeds_earned} 🌱
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <QuickLink
          href="/chat"
          icon={<MessageSquare className="h-4 w-4" />}
          title="NAMA-PILOTE"
          desc="Copilote IA — sécurité, écoconduite, sagesse"
        />
        <QuickLink
          href="/aide"
          icon={<TreeDeciduous className="h-4 w-4" />}
          title="Centre d'aide"
          desc="FAQ et contact support"
        />
      </section>

      <div className="mt-8">
        <CrossPromoBanner />
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function Badge({ score }: { score: number | null }) {
  if (score == null) return null
  const color =
    score >= 90
      ? 'bg-amber-400/15 text-amber-300'
      : score >= 75
      ? 'bg-slate-300/15 text-slate-200'
      : score >= 60
      ? 'bg-amber-700/20 text-amber-200'
      : 'bg-slate-600/20 text-slate-300'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${color}`}>
      {score}
    </span>
  )
}

function QuickLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 transition hover:border-[var(--border-glow)] hover:bg-white/[0.04]"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
      </div>
    </Link>
  )
}

function formatKm(km: number) {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K`
  return Math.round(km).toString()
}
