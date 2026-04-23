'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, Trophy, Ticket, Zap } from 'lucide-react'

interface WinnerEntry {
  user_id: string
  display_name?: string
  rank: number
  amount_cents: number
  score?: number
}

interface ContestResultRow {
  id: string
  period_type: string
  period_start: string
  period_end: string
  total_pool_cents: number
  winners: WinnerEntry[]
  completed_at: string
}

interface KarmaDrawRow {
  id: string
  game_type: string
  period_start: string
  period_end: string
  pool_cents: number
  status: string
  drawn_at: string | null
}

interface Snapshot {
  weekly: {
    period_start: string
    period_end: string
    already_drawn: boolean
    existing: ContestResultRow | null
    estimated_pool_cents: number
  }
  monthly: {
    period_start: string
    period_end: string
    already_drawn: boolean
    existing: KarmaDrawRow | null
    estimated_pool_cents: number
    tickets_in_circulation: number
  }
  pools: {
    reward_users_cents: number
  }
  history: {
    contest_results: ContestResultRow[]
    karma_draws: KarmaDrawRow[]
  }
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function ContestsClient() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<'weekly' | 'monthly' | null>(null)
  const [triggerResult, setTriggerResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/contests/current')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible.')
      setData(json as Snapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const trigger = useCallback(async (target: 'weekly' | 'monthly') => {
    const label = target === 'weekly' ? 'classement hebdo' : 'tirage mensuel'
    if (!window.confirm(`Forcer la clôture du ${label} maintenant ?\nAction IRRÉVERSIBLE — les récompenses seront distribuées.`)) return
    setTriggering(target)
    setTriggerResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/contests/trigger-closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Déclenchement impossible.')
      const resultStatus = json.result?.status ?? 'done'
      setTriggerResult(`✅ ${label} déclenché (${resultStatus})`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Déclenchement impossible.')
    } finally {
      setTriggering(null)
    }
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {triggerResult && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300" role="status">
          {triggerResult}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <section
          className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#F97316]/10 to-transparent p-6"
          data-testid="contest-weekly-card"
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#F97316]" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
              Classement hebdo
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatDate(data.weekly.period_start)} → {formatDate(data.weekly.period_end)}
          </p>
          <div className="mt-4 space-y-1 text-sm">
            <p>
              Pool reward users :{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatEur(data.pools.reward_users_cents)} €
              </span>
            </p>
            <p>
              6% hebdo estimé :{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatEur(data.weekly.estimated_pool_cents)} €
              </span>
            </p>
            <p className="text-[var(--text-muted)]">
              {data.weekly.already_drawn ? '✅ Période clôturée' : '⏳ En cours — clôture dim 23h59 UTC par le CRON'}
            </p>
          </div>
          {!data.weekly.already_drawn && (
            <button
              type="button"
              onClick={() => trigger('weekly')}
              disabled={triggering === 'weekly'}
              data-testid="trigger-weekly"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-2 text-xs font-semibold text-[#F97316] hover:bg-[#F97316]/20 transition-colors disabled:opacity-40"
            >
              {triggering === 'weekly' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Forcer la clôture maintenant
            </button>
          )}
        </section>

        <section
          className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#0EA5E9]/10 to-transparent p-6"
          data-testid="contest-monthly-card"
        >
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#0EA5E9]" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
              Tirage mensuel
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatDate(data.monthly.period_start)} → {formatDate(data.monthly.period_end)}
          </p>
          <div className="mt-4 space-y-1 text-sm">
            <p>
              Tickets en circulation :{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {data.monthly.tickets_in_circulation.toLocaleString('fr-FR')}
              </span>
            </p>
            <p>
              4% mensuel estimé :{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatEur(data.monthly.estimated_pool_cents)} €
              </span>
            </p>
            <p className="text-[var(--text-muted)]">
              {data.monthly.already_drawn
                ? '✅ Tirage effectué'
                : data.monthly.existing
                  ? '⏳ Draw créé, en attente de finalisation'
                  : '⏳ En cours — tirage dernier jour du mois par le CRON'}
            </p>
          </div>
          {!data.monthly.already_drawn && (
            <button
              type="button"
              onClick={() => trigger('monthly')}
              disabled={triggering === 'monthly'}
              data-testid="trigger-monthly"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 px-4 py-2 text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9]/20 transition-colors disabled:opacity-40"
            >
              {triggering === 'monthly' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Forcer la clôture maintenant
            </button>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Historique hebdomadaire
        </h2>
        {data.history.contest_results.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center text-sm text-[var(--text-muted)]">
            Aucun classement clôturé à ce jour.
          </div>
        ) : (
          <div className="space-y-2" data-testid="contest-history-list">
            {data.history.contest_results.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {row.period_type} · {formatDate(row.period_start)} → {formatDate(row.period_end)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {Array.isArray(row.winners) ? row.winners.length : 0} gagnants · pool {formatEur(row.total_pool_cents)} €
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  clôt. {new Date(row.completed_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Historique tirages mensuels
        </h2>
        {data.history.karma_draws.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center text-sm text-[var(--text-muted)]">
            Aucun tirage clôturé à ce jour.
          </div>
        ) : (
          <div className="space-y-2" data-testid="draws-history-list">
            {data.history.karma_draws.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {row.game_type} · {formatDate(row.period_start)} → {formatDate(row.period_end)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Status {row.status} · pool {formatEur(row.pool_cents)} €
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {row.drawn_at ? `clôt. ${new Date(row.drawn_at).toLocaleDateString('fr-FR')}` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
