'use client'

import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AchievementCardItem {
  id: string
  slug: string
  title: string
  description: string
  icon: string | null
  rarity: string
  pointsReward: number
  unlocked: boolean
  unlockedAt: string | null
  progress: number
}

interface AchievementCardProps {
  item: AchievementCardItem
}

const RARITY_STYLE: Record<string, { badge: string; ring: string; label: string }> = {
  common: {
    badge: 'bg-slate-500/10 text-slate-300',
    ring: 'ring-slate-500/20',
    label: 'Commun',
  },
  rare: {
    badge: 'bg-blue-500/10 text-blue-300',
    ring: 'ring-blue-500/20',
    label: 'Rare',
  },
  epic: {
    badge: 'bg-purple-500/10 text-purple-300',
    ring: 'ring-purple-500/30',
    label: 'Épique',
  },
  legendary: {
    badge: 'bg-amber-500/10 text-amber-300',
    ring: 'ring-amber-500/40',
    label: 'Légendaire',
  },
}

export default function AchievementCard({ item }: AchievementCardProps) {
  const rarity = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common
  const unlocked = item.unlocked

  return (
    <article
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border p-4 ring-1 transition',
        unlocked
          ? 'border-[var(--border-glow)] bg-white/[0.04] ring-[var(--cyan)]/20 hover:border-[var(--cyan)]/40'
          : 'border-[var(--border)] bg-white/[0.015] opacity-80 ' + rarity.ring,
      )}
      data-testid={`achievement-${item.slug}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl',
              unlocked ? 'bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--purple)]/20' : 'bg-white/5 grayscale',
            )}
            aria-hidden
          >
            {item.icon ?? '🏆'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
            <span
              className={cn(
                'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                rarity.badge,
              )}
            >
              {rarity.label}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full',
            unlocked ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-[var(--text-muted)]',
          )}
          aria-label={unlocked ? 'Débloqué' : 'Verrouillé'}
        >
          {unlocked ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)]">{item.description}</p>

      {!unlocked && item.progress > 0 && item.progress < 100 && (
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>Progression</span>
            <span>{item.progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-700"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--cyan)]">
          +{item.pointsReward.toLocaleString('fr-FR')} pts
        </span>
        {item.unlockedAt && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {new Date(item.unlockedAt).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
    </article>
  )
}
