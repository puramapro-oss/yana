'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, ShieldBan, ShieldCheck, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'ambassadeur' | 'super_admin'
  plan: 'free' | 'essentiel' | 'infini' | 'legende'
  wallet_balance_cents: number
  purama_points: number
  xp: number
  level: number
  streak_days: number
  created_at: string
  metadata: Record<string, unknown> | null
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isBanned(metadata: Record<string, unknown> | null): boolean {
  if (!metadata) return false
  return metadata.banned === true
}

export default function UsersClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/admin/users', window.location.origin)
      url.searchParams.set('page', String(page))
      if (q.trim()) url.searchParams.set('q', q.trim())
      if (plan) url.searchParams.set('plan', plan)
      if (role) url.searchParams.set('role', role)
      const res = await fetch(url.toString())
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible.')
      setUsers(json.users ?? [])
      setTotal(json.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [page, q, plan, role])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 25)), [total])

  const toggleBan = useCallback(async (user: UserRow) => {
    const wasBanned = isBanned(user.metadata)
    const action = wasBanned ? 'unban' : 'ban'
    const reason = !wasBanned ? window.prompt('Motif du bannissement (facultatif) :') ?? undefined : undefined
    if (action === 'ban' && reason === null) return

    setBusyId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
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
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            placeholder="Email ou nom…"
            aria-label="Recherche"
            data-testid="admin-users-search"
            className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F97316] focus:outline-none"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => { setPage(1); setPlan(e.target.value) }}
          aria-label="Filtre plan"
          className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#F97316] focus:outline-none"
        >
          <option value="">Tous plans</option>
          <option value="free">Free</option>
          <option value="essentiel">Essentiel</option>
          <option value="infini">Infini</option>
          <option value="legende">Légende</option>
        </select>
        <select
          value={role}
          onChange={(e) => { setPage(1); setRole(e.target.value) }}
          aria-label="Filtre rôle"
          className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#F97316] focus:outline-none"
        >
          <option value="">Tous rôles</option>
          <option value="user">Utilisateur</option>
          <option value="ambassadeur">Ambassadeur</option>
          <option value="super_admin">Super-admin</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white/[0.02]">
        <table className="w-full text-sm" data-testid="admin-users-table">
          <thead className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-right">Wallet €</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Niv. / Streak</th>
              <th className="px-4 py-3">Créé</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  Aucun utilisateur avec ces filtres.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const banned = isBanned(u.metadata)
              const isSelfProtected = u.role === 'super_admin'
              return (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02]" data-testid={`admin-user-row-${u.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-primary)]">{u.full_name || '—'}</div>
                    <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                    {banned && (
                      <span className="mt-1 inline-block rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                        BANNI
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{u.role}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{u.plan}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">
                    {formatEur(u.wallet_balance_cents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {Number(u.purama_points).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {u.level} · {u.streak_days}j
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleBan(u)}
                      disabled={busyId === u.id || isSelfProtected}
                      title={isSelfProtected ? 'Impossible de bannir un super-admin' : ''}
                      data-testid={`admin-user-ban-${u.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        banned
                          ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/15'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {busyId === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : banned ? (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          Débannir
                        </>
                      ) : (
                        <>
                          <ShieldBan className="h-3 w-3" />
                          Bannir
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          Page {page} / {totalPages} — {total.toLocaleString('fr-FR')} utilisateurs
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 hover:bg-white/5"
          >
            <ChevronLeft className="h-3 w-3" /> Précédent
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 hover:bg-white/5"
          >
            Suivant <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
