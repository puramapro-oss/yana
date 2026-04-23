'use client'

import { Ticket } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

interface TicketBreakdown {
  signup: number
  referral: number
  mission: number
  share: number
  review: number
  challenge: number
  streak: number
  subscription: number
  points_purchase: number
  daily: number
}

interface TicketCounterProps {
  total: number
  breakdown: TicketBreakdown
}

const SOURCE_LABELS: Record<keyof TicketBreakdown, string> = {
  signup: 'Inscription',
  referral: 'Parrainages',
  mission: 'Missions',
  share: 'Partages',
  review: 'Avis',
  challenge: 'Challenges',
  streak: 'Streak',
  subscription: 'Abonnement',
  points_purchase: 'Achat points',
  daily: 'Daily gift',
}

export default function TicketCounter({ total, breakdown }: TicketCounterProps) {
  const entries = (Object.keys(breakdown) as Array<keyof TicketBreakdown>)
    .filter((key) => breakdown[key] > 0)
    .sort((a, b) => breakdown[b] - breakdown[a])

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--purple)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[var(--cyan)]/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Ticket className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider">Mes tickets actifs</span>
        </div>
        <p className="mt-2 font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--text-primary)] sm:text-6xl">
          <AnimatedCounter value={total} />
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {total === 0
            ? 'Gagne ton premier ticket pour participer'
            : `Tu participes au prochain tirage avec ${total} chance${total > 1 ? 's' : ''}.`}
        </p>

        {entries.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {entries.map((key) => (
              <span
                key={key}
                className="rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
              >
                {SOURCE_LABELS[key]} · <span className="font-semibold text-[var(--text-primary)]">{breakdown[key]}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
