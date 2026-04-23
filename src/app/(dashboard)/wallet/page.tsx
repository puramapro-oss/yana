'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import WalletBalance from '@/components/wallet/WalletBalance'
import TransactionList from '@/components/wallet/TransactionList'
import WithdrawModal from '@/components/wallet/WithdrawModal'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import type { WalletTransaction, Withdrawal } from '@/types'

interface BalanceResponse {
  balanceCents: number
  pendingCents: number
  withdrawnCents: number
  hasActiveWithdrawal: boolean
  minWithdrawalCents: number
}

interface TransactionsResponse {
  transactions: WalletTransaction[]
  withdrawals: Withdrawal[]
}

export default function WalletPage() {
  const { loading: authLoading, user } = useAuth()
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [history, setHistory] = useState<TransactionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [balanceRes, txRes] = await Promise.all([
        fetch('/api/wallet/balance', { cache: 'no-store' }),
        fetch('/api/wallet/transactions?limit=30', { cache: 'no-store' }),
      ])

      if (!balanceRes.ok) {
        if (balanceRes.status === 401) {
          setError('Session expirée. Reconnecte-toi.')
          setLoading(false)
          return
        }
        setError('Impossible de charger ton solde. Réessaie.')
        setLoading(false)
        return
      }
      if (!txRes.ok) {
        setError('Impossible de charger l\'historique. Réessaie.')
        setLoading(false)
        return
      }

      const balanceData: BalanceResponse = await balanceRes.json()
      const txData: TransactionsResponse = await txRes.json()

      setBalance(balanceData)
      setHistory(txData)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchAll()
  }, [user, fetchAll])

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState message="Session expirée. Reconnecte-toi pour accéder à ton portefeuille." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Portefeuille
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ton solde en euros. Retraits par virement SEPA dès 5 €.
        </p>
      </header>

      {loading && !balance ? (
        <>
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAll} />
      ) : balance && history ? (
        <>
          <WalletBalance
            balanceCents={balance.balanceCents}
            pendingCents={balance.pendingCents}
            withdrawnCents={balance.withdrawnCents}
            minWithdrawalCents={balance.minWithdrawalCents}
            hasActiveWithdrawal={balance.hasActiveWithdrawal}
            onWithdrawClick={() => setModalOpen(true)}
          />

          <section aria-labelledby="history-title" className="glass rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="history-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                Mouvements
              </h2>
              {history.transactions.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {history.transactions.length} entrée{history.transactions.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <TransactionList
              transactions={history.transactions}
              withdrawals={history.withdrawals}
            />
          </section>

          <WithdrawModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            balanceCents={balance.balanceCents}
            minWithdrawalCents={balance.minWithdrawalCents}
            onSuccess={() => {
              setModalOpen(false)
              fetchAll()
            }}
          />
        </>
      ) : null}
    </div>
  )
}
