'use client'

import { cn, formatDate, formatPrice } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import { Users } from 'lucide-react'
import type { Referral } from '@/types'

type ReferralWithProfile = Referral & {
  referred_full_name: string | null
  referred_email: string | null
}

interface ReferralListProps {
  items: ReferralWithProfile[]
}

const STATUS_LABELS: Record<Referral['status'], { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-500/10 text-yellow-300' },
  subscribed: { label: 'Abonné', className: 'bg-emerald-500/10 text-emerald-300' },
  expired: { label: 'Expiré', className: 'bg-white/5 text-[var(--text-muted)]' },
  refunded: { label: 'Remboursé', className: 'bg-red-500/10 text-red-300' },
}

function maskedName(r: ReferralWithProfile): string {
  if (r.referred_full_name) return r.referred_full_name
  if (r.referred_email) {
    const [local] = r.referred_email.split('@')
    return local.length > 2 ? `${local.slice(0, 2)}…` : local
  }
  return 'Filleul anonyme'
}

export default function ReferralList({ items }: ReferralListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title="Pas encore de filleul"
        description="Partage ton lien. Dès qu'un ami s'inscrit, il apparaît ici."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => {
        const status = STATUS_LABELS[r.status]
        return (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 sm:p-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--purple)]/20 text-xs font-semibold text-[var(--text-primary)]">
                N{r.tier}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{maskedName(r)}</p>
                <p className="text-xs text-[var(--text-muted)]">Inscription · {formatDate(r.created_at)}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {r.commission_cents > 0 && (
                <span className="text-sm font-medium text-emerald-300">
                  +{formatPrice(r.commission_cents)}
                </span>
              )}
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', status.className)}>
                {status.label}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
