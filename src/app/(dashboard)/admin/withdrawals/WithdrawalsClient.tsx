'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2, X, Banknote } from 'lucide-react'

interface WithdrawalRow {
  id: string
  user_id: string
  amount_cents: number
  iban_masked: string
  status: string
  requested_at: string
  processed_at: string | null
  rejection_reason: string | null
  user_email: string | null
  user_name: string | null
}

const STATUS_TABS = [
  { slug: 'pending', label: 'À traiter' },
  { slug: 'processing', label: 'En cours' },
  { slug: 'completed', label: 'Complétés' },
  { slug: 'rejected', label: 'Rejetés' },
] as const

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function WithdrawalsClient() {
  const [status, setStatus] = useState<string>('pending')
  const [rows, setRows] = useState<WithdrawalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${encodeURIComponent(status)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible.')
      setRows(json.withdrawals ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const doAction = useCallback(async (row: WithdrawalRow, action: 'approve' | 'reject' | 'complete') => {
    let reason: string | undefined
    if (action === 'reject') {
      const input = window.prompt('Motif du rejet (obligatoire, envoyé à l\'utilisateur) :')
      if (!input || input.trim().length < 3) return
      reason = input.trim()
    }
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/admin/withdrawals/${row.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Action impossible.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setBusyId(null)
    }
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            onClick={() => setStatus(tab.slug)}
            data-testid={`withdrawals-tab-${tab.slug}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              status === tab.slug
                ? 'bg-[#F97316] text-black'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-10 text-center">
          <Banknote className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Aucun retrait avec le statut « {status} ».</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="withdrawals-list">
          {rows.map((row) => (
            <div
              key={row.id}
              data-testid={`withdrawal-row-${row.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatEur(row.amount_cents)} €
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {row.user_email ?? 'anonymous'} · {row.user_name ?? '—'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  IBAN {row.iban_masked} · demandé {new Date(row.requested_at).toLocaleString('fr-FR')}
                </p>
                {row.rejection_reason && (
                  <p className="mt-1 text-xs text-red-300">Motif rejet : {row.rejection_reason}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => doAction(row, 'approve')}
                      disabled={busyId === row.id}
                      data-testid={`withdrawal-approve-${row.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 px-3 py-1.5 text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9]/20 transition-colors disabled:opacity-40"
                    >
                      {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => doAction(row, 'reject')}
                      disabled={busyId === row.id}
                      data-testid={`withdrawal-reject-${row.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      <X className="h-3 w-3" />
                      Rejeter
                    </button>
                  </>
                )}
                {status === 'processing' && (
                  <button
                    type="button"
                    onClick={() => doAction(row, 'complete')}
                    disabled={busyId === row.id}
                    data-testid={`withdrawal-complete-${row.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                  >
                    {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Marquer payé
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
