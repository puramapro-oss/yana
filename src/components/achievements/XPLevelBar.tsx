'use client'

import { Sparkles } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

interface XPLevelBarProps {
  level: number
  xp: number
  points: number
  unlockedCount: number
  totalCount: number
}

// Formule simple : chaque niveau = level * 1000 XP
function xpForLevel(level: number): number {
  return level * 1000
}

export default function XPLevelBar({ level, xp, points, unlockedCount, totalCount }: XPLevelBarProps) {
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const xpIntoLevel = Math.max(0, xp - currentLevelXp)
  const xpNeeded = Math.max(1, nextLevelXp - currentLevelXp)
  const progress = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100))

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--cyan)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[var(--purple)]/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] font-[family-name:var(--font-display)] text-2xl font-bold text-white"
            aria-hidden
          >
            {level}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Niveau {level}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              <AnimatedCounter value={xp} /> XP
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-5 sm:flex-col sm:items-end sm:gap-1">
          <div>
            <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <Sparkles className="h-3 w-3" /> Points
            </p>
            <p className="text-right font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
              {points.toLocaleString('fr-FR')}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Achievements</p>
            <p className="text-right font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
              {unlockedCount}<span className="text-[var(--text-muted)]"> / {totalCount}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex items-baseline justify-between text-xs text-[var(--text-muted)]">
          <span>Prochain niveau</span>
          <span>
            {xpIntoLevel.toLocaleString('fr-FR')} / {xpNeeded.toLocaleString('fr-FR')} XP
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
