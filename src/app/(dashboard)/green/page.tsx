'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TreeDeciduous, Leaf, Sparkles, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useTrees } from '@/hooks/useTrees'
import { formatDate } from '@/lib/utils'
import type { TreePlanted } from '@/types'

const FOREST_COLUMNS_DESKTOP = 10
const FOREST_MAX_DISPLAY = 120

export default function GreenPage() {
  const { trees, stats, loading, error, claimTree, refetch } = useTrees()
  const [claiming, setClaiming] = useState(false)

  async function handleClaim() {
    if (claiming) return
    setClaiming(true)
    const { error: errMsg } = await claimTree()
    setClaiming(false)
    if (errMsg) toast.error(errMsg)
    else toast.success('Un arbre de plus dans ta forêt 🌳')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          GREEN DRIVE 🌿
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Ta conduite compense du CO₂. Tous les 10 kg, un arbre est planté et scellé sur la blockchain Bitcoin.
        </p>
      </header>

      {loading && <GreenSkeleton />}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}{' '}
          <button onClick={refetch} className="underline hover:no-underline">
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon="🌳"
              label="Arbres plantés"
              value={String(stats.trees_planted_total)}
              testId="green-stat-trees"
            />
            <Stat
              icon="🌿"
              label="CO₂ compensé"
              value={`${Math.round(stats.co2_offset_total_kg)} kg`}
              testId="green-stat-co2"
            />
            <Stat
              icon="🛣️"
              label="Km parcourus"
              value={formatKm(stats.total_distance_km)}
              testId="green-stat-km"
            />
            <Stat
              icon="🚗"
              label="Trajets"
              value={String(stats.total_trips)}
              testId="green-stat-trips"
            />
          </section>

          <section
            className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
            aria-labelledby="next-tree"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <TreeDeciduous className="h-6 w-6" />
              </div>
              <div>
                <h2
                  id="next-tree"
                  className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]"
                >
                  {stats.trees_available_to_claim >= 1
                    ? `${stats.trees_available_to_claim} arbre${stats.trees_available_to_claim > 1 ? 's' : ''} à planter`
                    : 'Ton prochain arbre se prépare'}
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {stats.trees_available_to_claim >= 1
                    ? 'Ta conduite verte a atteint un palier. Clique pour officialiser ta plantation (certificat blockchain inclus).'
                    : `Encore ${stats.kg_to_next_tree.toFixed(1)} kg de CO₂ compensés avant ton prochain arbre.`}
                </p>
              </div>
            </div>
            <Button
              data-testid="green-claim"
              onClick={handleClaim}
              disabled={stats.trees_available_to_claim < 1 || claiming}
              loading={claiming}
              variant="primary"
              className="w-full sm:w-auto"
              icon={<Sparkles className="h-4 w-4" />}
            >
              Planter mon arbre
            </Button>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                Ta forêt
              </h2>
              {trees.length > FOREST_MAX_DISPLAY && (
                <p className="text-xs text-[var(--text-muted)]">
                  {FOREST_MAX_DISPLAY} plus récents · {trees.length} au total
                </p>
              )}
            </div>

            {trees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
                <div className="text-5xl" aria-hidden>
                  🌱
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Ta forêt commence bientôt. Chaque kilomètre compte.
                </p>
              </div>
            ) : (
              <Forest trees={trees.slice(0, FOREST_MAX_DISPLAY)} />
            )}
          </section>

          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<Leaf className="h-4 w-4" />}
              title="Comment YANA calcule ton CO₂"
              desc="Facteurs ADEME 2026 officiels appliqués à chaque trajet selon type de véhicule et d’énergie. Pas d’estimation magique — la donnée source est publique."
            />
            <InfoCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Preuve blockchain Bitcoin"
              desc="Chaque plantation est horodatée via OpenTimestamps (Bitcoin). Personne, même pas PURAMA, ne peut modifier la date ou le contenu de ton certificat."
            />
          </section>
        </>
      )}
    </div>
  )
}

function Forest({ trees }: { trees: TreePlanted[] }) {
  return (
    <div
      className="glass-card-static relative overflow-hidden p-6"
      role="list"
      aria-label="Arbres plantés"
    >
      <div
        className="grid gap-1 sm:gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${FOREST_COLUMNS_DESKTOP}, minmax(0, 1fr))`,
        }}
      >
        {trees.map((t) => (
          <TreeTile key={t.id} tree={t} />
        ))}
      </div>
    </div>
  )
}

function TreeTile({ tree }: { tree: TreePlanted }) {
  const verified = Boolean(tree.ots_proof)
  const plantedLabel = formatDate(tree.planted_at)
  return (
    <div
      role="listitem"
      className="group relative flex aspect-square items-center justify-center rounded-lg transition hover:bg-emerald-500/5"
      title={`Planté le ${plantedLabel}${verified ? ' · scellé blockchain' : ''}`}
    >
      <span
        className="text-2xl transition-transform duration-300 group-hover:-translate-y-0.5 sm:text-3xl"
        aria-hidden
      >
        🌳
      </span>
      {verified && (
        <span
          className="absolute bottom-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
          aria-label="Scellé sur la blockchain Bitcoin"
        >
          <ShieldCheck className="h-2 w-2" />
        </span>
      )}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  testId,
}: {
  icon: string
  label: string
  value: string
  testId?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4" data-testid={testId}>
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function InfoCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
          {icon}
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{desc}</p>
    </div>
  )
}

function GreenSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="skeleton mt-6 h-20 rounded-2xl" />
      <div className="skeleton mt-8 h-64 rounded-2xl" />
    </>
  )
}

function formatKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K`
  return Math.round(km).toString()
}
