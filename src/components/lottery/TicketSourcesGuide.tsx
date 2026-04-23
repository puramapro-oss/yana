'use client'

import { Gift, Share2, Star, Target, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SOURCES: Array<{ icon: LucideIcon; label: string; description: string; value: string }> = [
  { icon: Star, label: 'Inscription', description: 'Crée ton compte', value: '+1' },
  { icon: Users, label: 'Parrainage', description: 'Chaque filleul qui s\'inscrit', value: '+2' },
  { icon: Target, label: 'Mission validée', description: 'Safe Drive, covoiturage, Green Drive…', value: '+1' },
  { icon: Share2, label: 'Partage', description: 'Partage ton code sur les réseaux', value: '+1' },
  { icon: Gift, label: 'Abonnement', description: 'Chaque mois d\'abonnement actif', value: '+5' },
  { icon: Zap, label: 'Streak 7 jours', description: 'Connexion 7 jours d\'affilée', value: '+1' },
]

export default function TicketSourcesGuide() {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
        Comment gagner des tickets
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SOURCES.map(({ icon: Icon, label, description, value }) => (
          <li
            key={label}
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cyan)]/15 text-[var(--cyan)]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                <span className="text-xs font-semibold text-emerald-300">{value}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
