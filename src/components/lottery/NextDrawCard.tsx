'use client'

import { Calendar, Coins } from 'lucide-react'
import Countdown from '@/components/contest/Countdown'
import { formatPrice } from '@/lib/utils'
import { getCurrentMonthBounds } from '@/lib/contest-period'

interface NextDraw {
  id: string
  period_start: string
  period_end: string
  pool_cents: number
  max_winners: number
  status: string
}

interface NextDrawCardProps {
  draw: NextDraw | null
}

export default function NextDrawCard({ draw }: NextDrawCardProps) {
  // Fallback : si aucun tirage programmé en DB, on affiche quand même l'échéance
  // calculée (fin du mois courant) pour que l'user ait une cible visuelle.
  const monthBounds = getCurrentMonthBounds()
  const targetIso = draw?.period_end ?? monthBounds.end.toISOString()
  const pool = draw?.pool_cents ?? 0
  const maxWinners = draw?.max_winners ?? 10

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Calendar className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Prochain tirage mensuel</span>
          </div>
          <div className="mt-3">
            <Countdown target={targetIso} label="Temps restant" />
          </div>
        </div>

        <div className="flex flex-row gap-6 sm:flex-col sm:items-end sm:text-right">
          <div>
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Coins className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Cagnotte</span>
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-emerald-300 sm:text-3xl">
              {pool > 0 ? formatPrice(pool) : 'À venir'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Gagnants</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              {maxWinners}
            </p>
          </div>
        </div>
      </div>

      {!draw && (
        <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--text-muted)]">
          La cagnotte se remplit automatiquement à chaque abonnement (4 % du CA). Le tirage sera
          annoncé en début de mois prochain.
        </p>
      )}
    </div>
  )
}
