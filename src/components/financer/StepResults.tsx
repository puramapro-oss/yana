'use client'

import Link from 'next/link'
import { ExternalLink, RotateCcw, SearchX } from 'lucide-react'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import {
  PROFILS,
  REGIONS,
  SITUATIONS,
  TYPE_AIDE_LABELS,
  type ProfilKey,
  type RegionKey,
  type SituationKey,
  type TypeAideKey,
} from '@/lib/aides-catalog'
import type { Aide } from '@/types'

interface StepResultsProps {
  profil: ProfilKey | null
  region: RegionKey | null
  situations: SituationKey[]
  aides: Aide[] | null
  totalEur: number
  loading: boolean
  error: string | null
  onBack: () => void
  onRestart: () => void
  onRetry: () => void
}

const EUR = new Intl.NumberFormat('fr-FR')

export default function StepResults({
  profil,
  region,
  situations,
  aides,
  totalEur,
  loading,
  error,
  onBack,
  onRestart,
  onRetry,
}: StepResultsProps) {
  const profilLabel = PROFILS.find((p) => p.key === profil)?.label ?? '—'
  const regionLabel = REGIONS.find((r) => r.key === region)?.label ?? '—'
  const situationLabels = situations
    .map((s) => SITUATIONS.find((x) => x.key === s)?.label)
    .filter((v): v is string => Boolean(v))

  return (
    <section aria-labelledby="step-results-title" className="flex flex-col gap-5">
      <header>
        <h2
          id="step-results-title"
          className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl"
        >
          Tes aides cumulables
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {profilLabel} · {regionLabel}
          {situationLabels.length > 0 && ` · ${situationLabels.length} situation${situationLabels.length > 1 ? 's' : ''}`}
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : aides && aides.length === 0 ? (
        <div className="glass rounded-2xl p-6 sm:p-8">
          <EmptyState
            icon={<SearchX size={36} />}
            title="Aucune aide ne correspond"
            description="Élargis ta sélection ou recommence avec un profil différent. Certaines aides nationales ne nécessitent pas de situation particulière."
          />
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" size="md" onClick={onBack}>
              ← Ajuster
            </Button>
            <Button variant="primary" size="md" onClick={onRestart} icon={<RotateCcw size={16} />}>
              Recommencer
            </Button>
          </div>
        </div>
      ) : aides ? (
        <>
          <div className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Total cumulable maximal
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold text-emerald-300 sm:text-5xl">
                  {EUR.format(totalEur)} €
                </p>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {aides.length} aide{aides.length > 1 ? 's' : ''} identifiée
                {aides.length > 1 ? 's' : ''}
              </p>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Montants maximums officiels. L&apos;éligibilité exacte dépend de conditions détaillées (revenus, ancienneté, justificatifs).
            </p>
          </div>

          <ul className="flex flex-col gap-3" aria-label="Liste des aides éligibles">
            {aides.map((aide) => (
              <AideResultCard key={aide.id} aide={aide} />
            ))}
          </ul>

          <div className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
              NAMA-PILOTE lance les démarches pour toi
            </h3>
            <p className="mt-2 text-sm text-emerald-200/80">
              Après ton inscription, NAMA-PILOTE pré-remplit les dossiers éligibles et te guide étape par étape.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Créer un compte (14 j gratuits)
              </Link>
              <Button variant="secondary" size="md" onClick={onRestart} icon={<RotateCcw size={16} />}>
                Refaire le parcours
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="md" onClick={onBack} data-testid="step-results-back">
          ← Modifier mes réponses
        </Button>
      </div>
    </section>
  )
}

function AideResultCard({ aide }: { aide: Aide }) {
  const typeLabel = TYPE_AIDE_LABELS[aide.type_aide as TypeAideKey] ?? aide.type_aide
  return (
    <li className="glass flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[var(--text-primary)]">{aide.nom}</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{aide.description}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          <span className="rounded-full bg-white/5 px-2 py-0.5">{typeLabel}</span>
          {aide.region && aide.region !== 'national' && (
            <span className="rounded-full bg-white/5 px-2 py-0.5">{aide.region}</span>
          )}
          {aide.region === 'national' && (
            <span className="rounded-full bg-white/5 px-2 py-0.5">National</span>
          )}
          {aide.handicap_only && (
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-300">
              Handicap
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
        {aide.montant_max_eur ? (
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-emerald-300 sm:text-2xl">
            {EUR.format(aide.montant_max_eur)} €
          </p>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Montant variable</p>
        )}
        {aide.url_officielle && (
          <a
            href={aide.url_officielle}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--cyan)] hover:underline"
          >
            Source officielle
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  )
}
