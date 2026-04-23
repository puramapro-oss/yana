'use client'

import { ArrowDownToLine, Clock, Wallet } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'

interface WalletBalanceProps {
  balanceCents: number
  pendingCents: number
  withdrawnCents: number
  minWithdrawalCents: number
  hasActiveWithdrawal: boolean
  onWithdrawClick: () => void
}

export default function WalletBalance({
  balanceCents,
  pendingCents,
  withdrawnCents,
  minWithdrawalCents,
  hasActiveWithdrawal,
  onWithdrawClick,
}: WalletBalanceProps) {
  const canWithdraw = balanceCents >= minWithdrawalCents && !hasActiveWithdrawal
  const euros = balanceCents / 100

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--cyan)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-[var(--purple)]/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Wallet className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider">Solde disponible</span>
        </div>

        <p className="mt-2 font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--text-primary)] sm:text-6xl">
          <AnimatedCounter value={euros} decimals={2} suffix=" €" />
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider">En cours</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              {formatPrice(pendingCents)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <ArrowDownToLine className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider">Déjà versé</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              {formatPrice(withdrawnCents)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            size="md"
            onClick={onWithdrawClick}
            disabled={!canWithdraw}
            icon={<ArrowDownToLine size={16} />}
            data-testid="open-withdraw-modal"
          >
            Demander un retrait
          </Button>
          {!canWithdraw && (
            <p className="text-xs text-[var(--text-muted)]">
              {hasActiveWithdrawal
                ? 'Un retrait est déjà en cours.'
                : `Minimum ${formatPrice(minWithdrawalCents)} pour retirer.`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
