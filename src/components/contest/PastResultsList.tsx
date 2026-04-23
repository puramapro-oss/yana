'use client'

import { History } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatPrice } from '@/lib/utils'

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

interface PastResultsListProps {
  results: PastResult[]
}

export default function PastResultsList({ results }: PastResultsListProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={<History size={28} />}
        title="Pas encore d'historique"
        description="Le premier palmarès s'affichera ici après le tout premier tirage du dimanche."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {results.map((r) => {
        const top3 = [...r.winners].sort((a, b) => a.rank - b.rank).slice(0, 3)
        return (
          <li
            key={r.id}
            className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Semaine du {formatDate(r.period_start)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {r.winners.length} gagnant{r.winners.length > 1 ? 's' : ''}
                </p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-emerald-300">
                {formatPrice(r.total_pool_cents)}
              </p>
            </div>
            {top3.length > 0 && (
              <ol className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
                {top3.map((w) => (
                  <li
                    key={`${r.id}-${w.rank}`}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-[var(--text-primary)]">#{w.rank}</span>
                    <span className="text-[var(--text-secondary)]">{w.display_name}</span>
                    <span className="text-emerald-300">{formatPrice(w.amount_cents)}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        )
      })}
    </ul>
  )
}
