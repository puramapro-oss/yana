'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, Ticket, Sparkles, CheckCircle2 } from 'lucide-react'

interface TicketRow {
  id: string
  user_id: string | null
  name: string
  email: string
  subject: string
  message: string
  status: string
  resolved_by_ai: boolean
  ai_response: string | null
  escalated: boolean
  created_at: string
}

const STATUS_TABS = [
  { slug: 'open', label: 'À traiter' },
  { slug: 'in_progress', label: 'En cours' },
  { slug: 'resolved', label: 'Résolus' },
  { slug: 'closed', label: 'Clos' },
] as const

export default function TicketsClient() {
  const [status, setStatus] = useState<string>('open')
  const [rows, setRows] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/tickets?status=${encodeURIComponent(status)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible.')
      setRows(json.tickets ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const doAction = useCallback(async (row: TicketRow, action: 'in_progress' | 'resolve' | 'close') => {
    let note: string | undefined
    if (action === 'resolve' || action === 'close') {
      const input = window.prompt('Note interne (facultatif, ajoutée à l\'historique du ticket) :')
      note = input?.trim() || undefined
    }
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/admin/tickets/${row.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
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
            data-testid={`tickets-tab-${tab.slug}`}
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
          <Ticket className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Aucun ticket « {status} ».</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="tickets-list">
          {rows.map((row) => {
            const isOpen = expandedId === row.id
            return (
              <article
                key={row.id}
                data-testid={`ticket-row-${row.id}`}
                className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId((c) => (c === row.id ? null : row.id))}
                  className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{row.subject}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {row.name} · {row.email} ·{' '}
                      {new Date(row.created_at).toLocaleString('fr-FR')}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.resolved_by_ai && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD]">
                          <Sparkles className="h-2.5 w-2.5" />
                          Résolu par NAMA
                        </span>
                      )}
                      {row.escalated && (
                        <span className="inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                          Escaladé
                        </span>
                      )}
                      {!row.user_id && (
                        <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                          Invité
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Message
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{row.message}</p>
                    </div>
                    {row.ai_response && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Réponse / notes NAMA + admin
                        </p>
                        <p className="whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-sm text-[var(--text-secondary)]">
                          {row.ai_response}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {status === 'open' && (
                        <button
                          type="button"
                          onClick={() => doAction(row, 'in_progress')}
                          disabled={busyId === row.id}
                          data-testid={`ticket-progress-${row.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 px-3 py-1.5 text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9]/20 transition-colors disabled:opacity-40"
                        >
                          {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Passer en cours
                        </button>
                      )}
                      {(status === 'open' || status === 'in_progress') && (
                        <>
                          <button
                            type="button"
                            onClick={() => doAction(row, 'resolve')}
                            disabled={busyId === row.id}
                            data-testid={`ticket-resolve-${row.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                          >
                            {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Marquer résolu
                          </button>
                          <button
                            type="button"
                            onClick={() => doAction(row, 'close')}
                            disabled={busyId === row.id}
                            data-testid={`ticket-close-${row.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/5 transition-colors disabled:opacity-40"
                          >
                            Clore
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
