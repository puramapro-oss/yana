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
import type { Preference } from './types'
import { TYPE_LABELS } from './types'
import NotificationPref from './components/NotificationPref'

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
          {prefs.map((p) => (
            <NotificationPref key={p.type} pref={p} onPatch={patchPref} onToggleDay={toggleDay} />
          ))}
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
