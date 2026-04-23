'use client'

import { ArrowDownLeft, ArrowUpRight, Building2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn, formatDateTime, formatPrice } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import type { WalletTransaction, Withdrawal } from '@/types'

interface TransactionListProps {
  transactions: WalletTransaction[]
  withdrawals: Withdrawal[]
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    referral_commission: 'Commission parrainage',
    referral_n1: 'Parrainage niveau 1',
    referral_n2: 'Parrainage niveau 2',
    referral_n3: 'Parrainage niveau 3',
    mission_reward: 'Mission terminée',
    carpool_dual_reward: 'Récompense covoiturage',
    green_drive_reward: 'Green Drive',
    safe_drive_reward: 'Safe Drive',
    withdrawal_request: 'Retrait demandé',
    withdrawal_refund: 'Retrait remboursé',
    contest_prize: 'Concours — prix',
    lottery_prize: 'Tirage — prix',
    signup_bonus: 'Bonus inscription',
    ambassador_bonus: 'Bonus ambassadeur',
  }
  return labels[reason] ?? reason
}

function WithdrawalStatusBadge({ status }: { status: Withdrawal['status'] }) {
  const map = {
    pending: { label: 'En attente', className: 'bg-yellow-500/10 text-yellow-300', icon: Clock },
    processing: { label: 'En cours', className: 'bg-blue-500/10 text-blue-300', icon: Clock },
    completed: { label: 'Versé', className: 'bg-emerald-500/10 text-emerald-300', icon: CheckCircle2 },
    rejected: { label: 'Refusé', className: 'bg-red-500/10 text-red-300', icon: XCircle },
    cancelled: { label: 'Annulé', className: 'bg-white/5 text-[var(--text-muted)]', icon: XCircle },
  } as const
  const entry = map[status]
  const Icon = entry.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', entry.className)}>
      <Icon className="h-3 w-3" />
      {entry.label}
    </span>
  )
}

export default function TransactionList({ transactions, withdrawals }: TransactionListProps) {
  const hasContent = transactions.length > 0 || withdrawals.length > 0

  if (!hasContent) {
    return (
      <EmptyState
        icon={<ArrowDownLeft size={32} />}
        title="Aucun mouvement pour l'instant"
        description="Tes commissions et récompenses apparaîtront ici dès qu'elles seront créditées."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {withdrawals.length > 0 && (
        <section aria-labelledby="withdrawals-title">
          <h3 id="withdrawals-title" className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Retraits
          </h3>
          <ul className="flex flex-col gap-2">
            {withdrawals.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--purple)]/15 text-[var(--purple)]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {w.iban_masked}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Demandé · {formatDateTime(w.requested_at)}
                      {w.rejection_reason && ` · ${w.rejection_reason}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    −{formatPrice(w.amount_cents)}
                  </span>
                  <WithdrawalStatusBadge status={w.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {transactions.length > 0 && (
        <section aria-labelledby="transactions-title">
          <h3 id="transactions-title" className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Historique
          </h3>
          <ul className="flex flex-col gap-2">
            {transactions.map((tx) => {
              const isCredit = tx.direction === 'credit'
              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 sm:p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                        isCredit ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300',
                      )}
                    >
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {reasonLabel(tx.reason)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDateTime(tx.created_at)}</p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 text-sm font-semibold',
                      isCredit ? 'text-emerald-300' : 'text-[var(--text-primary)]',
                    )}
                  >
                    {isCredit ? '+' : '−'}{formatPrice(tx.amount_cents)}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
