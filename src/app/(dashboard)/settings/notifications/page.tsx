'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell, BellOff, ChevronLeft, Loader2, CheckCircle2, AlertTriangle, Send,
} from 'lucide-react'
import {
  detectCapability,
  currentPermission,
  isSubscribed as swIsSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from '@/lib/notifications-client/push'

type PrefType = 'daily' | 'achievement' | 'referral' | 'wallet' | 'contest' | 'lottery'
type Frequency = 'low' | 'normal' | 'high'

interface Preference {
  type: PrefType
  enabled: boolean
  days_of_week: number[]
  hour_start: number
  hour_end: number
  frequency: Frequency
  paused_until: string | null
}

const TYPE_LABELS: Record<PrefType, { label: string; desc: string }> = {
  daily:       { label: 'Rappel quotidien',  desc: 'Message personnalisé selon ton engagement.' },
  achievement: { label: 'Achievements',      desc: 'Quand tu débloques un badge.' },
  referral:    { label: 'Parrainage',        desc: 'Nouvel inscrit filleul, palier atteint.' },
  wallet:      { label: 'Wallet',            desc: 'Crédits, retraits, virements SEPA.' },
  contest:     { label: 'Classement hebdo',  desc: 'Gain hebdo, approche du podium.' },
  lottery:     { label: 'Tirage mensuel',    desc: 'Ticket gagnant, prochain tirage.' },
}

const DAYS = [
  { idx: 1, label: 'L' },
  { idx: 2, label: 'M' },
  { idx: 3, label: 'M' },
  { idx: 4, label: 'J' },
  { idx: 5, label: 'V' },
  { idx: 6, label: 'S' },
  { idx: 0, label: 'D' },
]

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<Preference[]>([])
  const [subServer, setSubServer] = useState(false)
  const [subBrowser, setSubBrowser] = useState(false)
  const [perm, setPerm] = useState<string>('default')
  const [supported, setSupported] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const pushToast = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg })
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchPrefs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/push/preferences', { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch_failed')
      const json = (await res.json()) as { preferences: Preference[]; subscribed: boolean }
      setPrefs(json.preferences)
      setSubServer(json.subscribed)
    } catch {
      pushToast('err', 'Impossible de charger tes préférences. Rafraîchis la page.')
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    const cap = detectCapability()
    setSupported(cap.supported)
    setPerm(currentPermission())
    swIsSubscribed().then(setSubBrowser)
    fetchPrefs()
  }, [fetchPrefs])

  const patchPref = useCallback(async (next: Preference) => {
    setPrefs((prev) => prev.map((p) => (p.type === next.type ? next : p)))
    const res = await fetch('/api/push/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: next.type,
        enabled: next.enabled,
        days_of_week: next.days_of_week,
        hour_start: next.hour_start,
        hour_end: next.hour_end,
        frequency: next.frequency,
        paused_until: next.paused_until,
      }),
    })
    if (!res.ok) {
      pushToast('err', 'Sauvegarde échouée, réessaie.')
      fetchPrefs()
    }
  }, [fetchPrefs, pushToast])

  const handleEnable = async () => {
    setBusy(true)
    try {
      const r = await subscribeToPush()
      if (r.ok) {
        pushToast('ok', 'Notifications push activées.')
        setSubBrowser(true)
        setSubServer(true)
        setPerm(currentPermission())
      } else if (r.reason === 'denied') {
        pushToast('err', 'Permission refusée par le navigateur. Autorise-la dans les paramètres du site.')
        setPerm('denied')
      } else if (r.reason === 'unsupported') {
        pushToast('err', "Ton navigateur ne supporte pas les notifications push.")
      } else {
        pushToast('err', `Erreur : ${r.detail || 'inconnue'}.`)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    try {
      const r = await unsubscribeFromPush()
      if (r.ok) {
        pushToast('ok', 'Notifications push désactivées.')
        setSubBrowser(false)
        setSubServer(false)
      } else {
        pushToast('err', `Erreur : ${r.detail || 'inconnue'}.`)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    setBusy(true)
    try {
      const r = await sendTestPush()
      if (r.ok && (r.sent ?? 0) > 0) {
        pushToast('ok', 'Test envoyé. Regarde tes notifications système.')
      } else {
        pushToast('err', "Aucun appareil souscrit. Active d'abord les push.")
      }
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (p: Preference, dayIdx: number) => {
    const next = p.days_of_week.includes(dayIdx)
      ? p.days_of_week.filter((d) => d !== dayIdx)
      : [...p.days_of_week, dayIdx]
    patchPref({ ...p, days_of_week: next.sort() })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      <Link
        href="/settings"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] transition hover:text-[var(--foreground)]"
      >
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>

      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <Bell className="h-8 w-8 text-[var(--accent-primary)] sm:h-10 sm:w-10" />
          Notifications push
        </h1>
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] sm:text-base">
          Choisis quand et comment YANA t&apos;écrit. Tout est adaptatif : plus tu interagis, plus c&apos;est utile.
        </p>
      </header>

      {/* Master status card */}
      <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_90%,transparent)] p-5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--accent-primary)_15%,transparent)] p-2.5">
              {subBrowser ? (
                <Bell className="h-6 w-6 text-[var(--accent-primary)]" />
              ) : (
                <BellOff className="h-6 w-6 text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {subBrowser ? 'Notifications activées' : 'Notifications désactivées'}
              </p>
              <p className="mt-0.5 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                {supported === false
                  ? "Ton navigateur ne supporte pas les push (Safari iOS nécessite iOS 16.4+ en PWA installée)."
                  : subBrowser
                    ? 'Tu peux régler chaque type ci-dessous. Désactive à tout moment.'
                    : 'Active pour recevoir les notifications essentielles. Tu gardes le contrôle total.'}
              </p>
              {perm === 'denied' ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[color-mix(in_oklab,var(--red,#ef4444)_80%,transparent)]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Permission refusée. Autorise les notifications dans les paramètres du site (cadenas → Notifications → Autoriser).
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subBrowser ? (
              <>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-medium transition hover:bg-[color-mix(in_oklab,var(--surface-elevated)_80%,var(--foreground))] disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Test
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_85%,transparent)] transition hover:bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] disabled:opacity-60"
                >
                  <BellOff className="h-4 w-4" /> Désactiver
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy || supported === false || perm === 'denied'}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_color-mix(in_oklab,var(--accent-primary)_40%,transparent)] transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Activer
              </button>
            )}
          </div>
        </div>
        {subBrowser && !subServer ? (
          <p className="mt-3 rounded-lg bg-[color-mix(in_oklab,var(--amber,#f59e0b)_15%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--foreground)_85%,transparent)]">
            Le navigateur est abonné mais le serveur ne voit pas cet appareil. Désactive puis réactive pour resynchroniser.
          </p>
        ) : null}
      </section>

      {/* Preferences per type */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
          Chargement des préférences…
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          {prefs.map((p) => {
            const meta = TYPE_LABELS[p.type]
            const paused = p.paused_until && new Date(p.paused_until) > new Date()
            return (
              <article
                key={p.type}
                data-testid={`pref-${p.type}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{meta.label}</h2>
                    <p className="mt-0.5 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                      {meta.desc}
                    </p>
                  </div>
                  <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => patchPref({ ...p, enabled: e.target.checked })}
                      className="peer sr-only"
                      aria-label={`Activer ${meta.label}`}
                    />
                    <span className="absolute inset-0 rounded-full bg-[color-mix(in_oklab,var(--foreground)_20%,transparent)] transition peer-checked:bg-[var(--accent-primary)]" />
                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </label>
                </header>

                {p.enabled && !paused ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
                        Jours
                      </label>
                      <div className="mt-2 flex gap-1.5">
                        {DAYS.map((d) => {
                          const active = p.days_of_week.includes(d.idx)
                          return (
                            <button
                              key={d.idx}
                              type="button"
                              onClick={() => toggleDay(p, d.idx)}
                              className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                                active
                                  ? 'bg-[var(--accent-primary)] text-white'
                                  : 'bg-[var(--surface-elevated)] text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] hover:bg-[color-mix(in_oklab,var(--surface-elevated)_80%,var(--foreground))]'
                              }`}
                            >
                              {d.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
                        Fréquence
                      </label>
                      <div className="mt-2 flex gap-2">
                        {(['low', 'normal', 'high'] as Frequency[]).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => patchPref({ ...p, frequency: f })}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                              p.frequency === f
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--surface-elevated)] text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] hover:bg-[color-mix(in_oklab,var(--surface-elevated)_80%,var(--foreground))]'
                            }`}
                          >
                            {f === 'low' ? 'Basse' : f === 'normal' ? 'Normale' : 'Haute'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
                        Plage horaire (UTC)
                      </label>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={p.hour_start}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0))
                            patchPref({ ...p, hour_start: v })
                          }}
                          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm"
                          aria-label="Heure de début"
                        />
                        <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">→</span>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={p.hour_end}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0))
                            patchPref({ ...p, hour_end: v })
                          }}
                          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm"
                          aria-label="Heure de fin"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
                        Pause jusqu&apos;à
                      </label>
                      <input
                        type="date"
                        value={p.paused_until ? p.paused_until.slice(0, 10) : ''}
                        onChange={(e) => {
                          const v = e.target.value
                          patchPref({
                            ...p,
                            paused_until: v ? new Date(v + 'T23:59:59Z').toISOString() : null,
                          })
                        }}
                        className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ) : paused ? (
                  <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                    En pause jusqu&apos;au {new Date(p.paused_until!).toLocaleDateString('fr-FR')}.{' '}
                    <button
                      type="button"
                      onClick={() => patchPref({ ...p, paused_until: null })}
                      className="underline hover:text-[var(--foreground)]"
                    >
                      Lever la pause
                    </button>
                  </p>
                ) : null}
              </article>
            )
          })}
        </section>
      )}

      <footer className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-xs text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
        YANA ne t&apos;enverra jamais plus d&apos;1 push quotidien automatique. Les événements importants
        (gains, achievements) passent toujours si tu es abonné. RGPD : tes préférences sont
        stockées chiffrées côté serveur, suppression auto avec ton compte.
      </footer>

      {toast ? (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
            toast.kind === 'ok'
              ? 'bg-[color-mix(in_oklab,var(--green,#10b981)_95%,transparent)] text-white'
              : 'bg-[color-mix(in_oklab,var(--red,#ef4444)_95%,transparent)] text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {toast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {toast.msg}
          </span>
        </div>
      ) : null}
    </div>
  )
}
