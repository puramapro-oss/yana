'use client'

import { useCallback, useEffect, useState } from 'react'
import { Target, Loader2, AlertCircle, Send, Check } from 'lucide-react'

interface Intention {
  id: string
  content: string
  completed: boolean
  created_at: string
}

export default function IntentionClient() {
  const [intentions, setIntentions] = useState<Intention[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/intentions')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible.')
      setIntentions(json.intentions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim().length < 3) {
      setError('Intention trop courte (min 3 caractères).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Enregistrement impossible.')
      setContent('')
      setFlash(`+${json.xp_earned ?? 3} XP éveil — que ta route te guide ✨`)
      setTimeout(() => setFlash(null), 4000)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setSubmitting(false)
    }
  }, [content, load])

  const toggle = useCallback(async (intent: Intention) => {
    setToggling(intent.id)
    try {
      const res = await fetch('/api/intentions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: intent.id, completed: !intent.completed }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Mise à jour impossible.')
      if (!intent.completed) setFlash('Intention honorée 🙏 +5 XP')
      setTimeout(() => setFlash(null), 3000)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible.')
    } finally {
      setToggling(null)
    }
  }, [load])

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#F97316] to-[#7C3AED]">
          <Target className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
          Intention du jour
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Avant de prendre la route, pose une intention claire. Ton mental suit ta direction.
        </p>
      </header>

      <form onSubmit={submit} className="glass mb-8 rounded-2xl p-5 sm:p-6" data-testid="intention-form">
        <label htmlFor="intention-content" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Mon intention aujourd&apos;hui
        </label>
        <textarea
          id="intention-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex. Conduire avec patience, respecter chaque usager, arriver calme."
          rows={3}
          minLength={3}
          maxLength={280}
          required
          data-testid="intention-input"
          className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F97316] focus:outline-none"
        />
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {flash && (
          <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300" role="status">
            {flash}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          data-testid="intention-submit"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F97316] to-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Poser mon intention
        </button>
      </form>

      <section aria-labelledby="intention-history">
        <h2 id="intention-history" className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Tes dernières intentions
        </h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : intentions.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center text-sm text-[var(--text-muted)]">
            Pose ta première intention ci-dessus — un seul objectif clair pour la route.
          </div>
        ) : (
          <ul className="space-y-2" data-testid="intention-list">
            {intentions.map((intent) => (
              <li
                key={intent.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                  intent.completed
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-[var(--border)] bg-white/[0.02]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(intent)}
                  disabled={toggling === intent.id}
                  aria-label={intent.completed ? 'Marquer non honorée' : 'Marquer honorée'}
                  data-testid={`intention-toggle-${intent.id}`}
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    intent.completed
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-[var(--border)] hover:border-[var(--text-primary)]'
                  }`}
                >
                  {toggling === intent.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : intent.completed ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`whitespace-pre-wrap text-sm ${
                      intent.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {intent.content}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {new Date(intent.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
