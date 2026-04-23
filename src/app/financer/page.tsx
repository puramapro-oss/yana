import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import { APP_NAME } from '@/lib/constants'
import type { Aide } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

// /financer — 45 aides FR mobilité seedées dans yana.aides
// Page publique (pas d'auth requise) — découverte avant signup
export default async function FinancerPage() {
  const admin = createServiceClient()
  const { data: aides } = await admin
    .from('aides')
    .select('*')
    .eq('active', true)
    .order('montant_max_eur', { ascending: false, nullsFirst: false })
    .limit(100)

  const total = (aides ?? []).reduce((s, a: Aide) => s + (a.montant_max_eur ?? 0), 0)
  const categories = [
    { id: 'all', label: 'Toutes', count: aides?.length ?? 0 },
    { id: 'prime', label: 'Primes', count: (aides ?? []).filter((a: Aide) => a.type_aide === 'prime').length },
    { id: 'cheque', label: 'Chèques', count: (aides ?? []).filter((a: Aide) => a.type_aide === 'cheque').length },
    { id: 'allocation', label: 'Allocations', count: (aides ?? []).filter((a: Aide) => a.type_aide === 'allocation').length },
    { id: 'credit_impot', label: 'Crédit impôt', count: (aides ?? []).filter((a: Aide) => a.type_aide === 'credit_impot').length },
  ]

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          PURAMA · Mobility Wellness
        </p>
        <h1 className="mt-3 gradient-text font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
          45 aides pour financer ta route
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
          Bonus écologique, prime à la conversion, Forfait Mobilité Durable, aide permis, aides
          handicap… {APP_NAME} liste les dispositifs officiels français que tu peux cumuler pour
          réduire le coût de ta mobilité.
        </p>
      </header>

      {/* Compteur social proof — dynamique DB, 0 chiffre inventé (§1 INTERDICTIONS) */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Kpi label="Aides référencées" value={String(aides?.length ?? 0)} icon="📋" />
        <Kpi
          label="Total cumulable max"
          value={`jusqu'à ${new Intl.NumberFormat('fr-FR').format(total)} €`}
          icon="💶"
        />
        <Kpi
          label="Régions couvertes"
          value={String(
            new Set(
              (aides ?? [])
                .map((a: Aide) => a.region)
                .filter((r): r is string => typeof r === 'string' && r !== 'national'),
            ).size + 1,
          )}
          icon="🗺️"
        />
      </div>

      {/* Filtres catégories (statiques P1, interactifs P4) */}
      <nav className="mt-10 flex flex-wrap gap-2" aria-label="Filtres catégories">
        {categories.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
          >
            {c.label} <span className="text-[var(--text-muted)]">({c.count})</span>
          </span>
        ))}
      </nav>

      {/* Liste des aides */}
      <section className="mt-8 grid gap-3" aria-label="Liste des aides">
        {(aides ?? []).slice(0, 30).map((aide: Aide) => (
          <AideCard key={aide.id} aide={aide} />
        ))}
        {(aides?.length ?? 0) > 30 && (
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            + {(aides?.length ?? 0) - 30} autres aides visibles après inscription ·{' '}
            <Link href="/signup" className="text-[var(--accent-primary)] underline">
              Créer un compte
            </Link>
          </p>
        )}
      </section>

      <div className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          NAMA-PILOTE trouve tes aides pour toi
        </h2>
        <p className="mt-2 text-sm text-emerald-200/80">
          Après ton inscription, NAMA-PILOTE analyse ton profil et te montre exactement quelles
          aides tu peux toucher, comment les demander, et tu peux lancer le dossier en 2 clics.
        </p>
        <Link
          href="/signup"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Créer un compte (14 j gratuits)
        </Link>
      </div>
    </main>
  )
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function AideCard({ aide }: { aide: Aide }) {
  return (
    <article className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 transition hover:border-[var(--accent-primary)]/30">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[var(--text-primary)]">{aide.nom}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{aide.description}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {aide.region && <span className="rounded-full bg-white/5 px-2 py-0.5">{aide.region}</span>}
          <span className="rounded-full bg-white/5 px-2 py-0.5">{aide.type_aide}</span>
          {aide.handicap_only && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-violet-300">
              Handicap
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 text-right">
        {aide.montant_max_eur && (
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-emerald-400">
            {new Intl.NumberFormat('fr-FR').format(aide.montant_max_eur)} €
          </p>
        )}
        {aide.url_officielle && (
          <a
            href={aide.url_officielle}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent-primary)] underline"
          >
            Lien officiel ↗
          </a>
        )}
      </div>
    </article>
  )
}
