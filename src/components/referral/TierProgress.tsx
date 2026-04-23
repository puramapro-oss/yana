'use client'

import { cn } from '@/lib/utils'
import type { ReferralTier } from '@/hooks/useReferral'

const TIERS: Array<{ tier: ReferralTier; label: string; threshold: number; reward: string }> = [
  { tier: 'bronze', label: 'Bronze', threshold: 5, reward: 'Statut ambassadeur' },
  { tier: 'argent', label: 'Argent', threshold: 10, reward: 'Bonus mensuel' },
  { tier: 'or', label: 'Or', threshold: 25, reward: 'Page perso publique' },
  { tier: 'platine', label: 'Platine', threshold: 50, reward: 'Priorité support' },
  { tier: 'diamant', label: 'Diamant', threshold: 75, reward: 'VIP communauté' },
  { tier: 'legende', label: 'Légende', threshold: 100, reward: 'Commissions héréditaires' },
]

interface TierProgressProps {
  currentTier: ReferralTier
  currentCount: number
}

export default function TierProgress({ currentTier, currentCount }: TierProgressProps) {
  const activeIndex = TIERS.findIndex((t) => t.tier === currentTier)
  const nextMilestone = TIERS.find((t) => t.threshold > currentCount) ?? null
  const progress = nextMilestone
    ? Math.min(100, (currentCount / nextMilestone.threshold) * 100)
    : 100

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Palier actuel</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {activeIndex >= 0 ? TIERS[activeIndex].label : 'Débutant'}
          </p>
        </div>
        {nextMilestone ? (
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Prochain palier</p>
            <p className="mt-1 text-sm font-medium text-[var(--cyan)]">
              {nextMilestone.label}
              <span className="ml-1 text-[var(--text-muted)]">· {nextMilestone.threshold - currentCount} restants</span>
            </p>
          </div>
        ) : (
          <span className="rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-3 py-1 text-xs font-medium text-white">
            Palier maximum
          </span>
        )}
      </div>

      {nextMilestone && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {currentCount} / {nextMilestone.threshold} filleuls directs
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TIERS.map((t, i) => {
          const reached = i <= activeIndex
          return (
            <div
              key={t.tier}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs transition',
                reached
                  ? 'border-[var(--cyan)]/30 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-muted)]',
              )}
            >
              <p className="font-medium">{t.label}</p>
              <p className="mt-0.5 opacity-80">{t.threshold}+ filleuls</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{t.reward}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
