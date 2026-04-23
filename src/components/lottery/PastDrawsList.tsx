'use client'

import { Sparkles } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatPrice } from '@/lib/utils'

interface PastWinner {
  rank: number
  display_name: string
  amount_cents: number
}

interface PastDraw {
  id: string
  period_start: string
  period_end: string
  pool_cents: number
  drawn_at: string | null
  winners: PastWinner[]
}

interface PastDrawsListProps {
  draws: PastDraw[]
}

export default function PastDrawsList({ draws }: PastDrawsListProps) {
  if (draws.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={28} />}
        title="Aucun tirage passé"
        description="Les palmarès apparaîtront ici après le premier tirage mensuel."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {draws.map((d) => {
        const top3 = d.winners.slice(0, 3)
        const drawnDate = d.drawn_at ?? d.period_end
        return (
          <li
            key={d.id}
            className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Tirage du {formatDate(drawnDate)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {d.winners.length} gagnant{d.winners.length > 1 ? 's' : ''}
                </p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-emerald-300">
                {formatPrice(d.pool_cents)}
              </p>
            </div>
            {top3.length > 0 && (
              <ol className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
                {top3.map((w) => (
                  <li
                    key={`${d.id}-${w.rank}`}
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
