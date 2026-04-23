'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface Affirmation {
  id: string
  category: string
  text: string
  xp_earned_today: number
}

const CATEGORY_BADGE: Record<string, string> = {
  love: '💗 Amour',
  power: '⚡ Puissance',
  abundance: '✨ Abondance',
  health: '🌿 Santé',
  wisdom: '🦉 Sagesse',
  gratitude: '🙏 Gratitude',
  journey: '🛞 Voyage',
  safety: '🛡️ Sécurité',
}

export default function AffirmationCard() {
  const [data, setData] = useState<Affirmation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/affirmations/today')
        if (!res.ok) {
          if (!cancelled) setData(null)
          return
        }
        const json = (await res.json()) as Affirmation
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-[var(--border)] bg-white/[0.02] px-5 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">NAMA prépare ton affirmation…</p>
      </div>
    )
  }

  if (!data) return null

  const badge = CATEGORY_BADGE[data.category] ?? data.category

  return (
    <aside
      className="relative overflow-hidden rounded-3xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#0EA5E9]/10 p-5 sm:p-6"
      data-testid="affirmation-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Affirmation du jour
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
              {badge}
            </span>
            {data.xp_earned_today > 0 && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                +{data.xp_earned_today} XP
              </span>
            )}
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg leading-snug text-[var(--text-primary)]">
            « {data.text} »
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Inspire profondément. Laisse cette intention imprégner ton trajet.
          </p>
        </div>
      </div>
    </aside>
  )
}
