'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Car, MessageSquare, TreeDeciduous, Users } from 'lucide-react'

export default function DashboardPage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'pilote'

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-sm text-[var(--text-muted)]">Bienvenue,</p>
        <h1 className="gradient-text font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
          {firstName} 🛞
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Chaque trajet est un chapitre de ta légende.
        </p>
      </header>

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
        <Stat label="Arbres plantés" value={String(profile?.trees_planted_total ?? 0)} icon="🌳" />
      </section>

      <section
        aria-labelledby="coming-next"
        className="mt-10 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6"
      >
        <h2
          id="coming-next"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]"
        >
          Ton tableau de bord se construit
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          YANA est en phase de lancement. Ces fonctionnalités arrivent très bientôt :
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <FeatureRow
            icon={Car}
            title="SAFE DRIVE"
            desc="Scoring conduite temps réel + Graines à chaque trajet safe"
          />
          <FeatureRow
            icon={TreeDeciduous}
            title="GREEN DRIVE"
            desc="CO₂ live et plantation d'arbres automatique"
          />
          <FeatureRow
            icon={Users}
            title="COVOITURAGE DUAL"
            desc="Passager ET conducteur gagnent Graines + €"
          />
          <FeatureRow
            icon={MessageSquare}
            title="NAMA-PILOTE"
            desc="Ton copilote IA : sécurité, écoconduite, sagesse du voyage"
          />
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent-primary)]/20 transition hover:brightness-110"
          >
            <MessageSquare className="h-4 w-4" />
            Parler à NAMA-PILOTE
          </Link>
          <Link
            href="/aide"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
          >
            Centre d&apos;aide
          </Link>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function FeatureRow({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Car
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-white/[0.01] p-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
      </div>
    </li>
  )
}

function formatKm(km: number) {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K`
  return Math.round(km).toString()
}
