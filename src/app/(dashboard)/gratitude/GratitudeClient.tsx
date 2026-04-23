'use client'

import { useCallback, useEffect, useState } from 'react'
import { Heart, Loader2, AlertCircle, Send } from 'lucide-react'

interface Entry {
  id: string
  content: string
  created_at: string
}

export default function GratitudeClient() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/gratitude')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Chargement impossible.')
      setEntries(json.entries ?? [])
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
      setError('Note trop courte (min 3 caractères).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Enregistrement impossible.')
      setContent('')
      setFlash(`+${json.xp_earned ?? 5} XP éveil — merci 🙏`)
      setTimeout(() => setFlash(null), 4000)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setSubmitting(false)
    }
  }, [content, load])

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-[#7C3AED]">
          <Heart className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
          Journal de gratitude
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Note 3 choses pour lesquelles tu es reconnaissant aujourd&apos;hui. Le cerveau
          s&apos;habitue à chercher le bon.
        </p>
      </header>

      <form onSubmit={submit} className="glass mb-8 rounded-2xl p-5 sm:p-6" data-testid="gratitude-form">
        <label htmlFor="gratitude-content" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Ta gratitude
        </label>
        <textarea
          id="gratitude-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex. Je suis reconnaissant pour cette belle route ce matin, la lumière douce, le silence…"
          rows={3}
          minLength={3}
          maxLength={500}
          required
          data-testid="gratitude-input"
          className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-pink-500 focus:outline-none"
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
          data-testid="gratitude-submit"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enregistrer
        </button>
      </form>

      <section aria-labelledby="gratitude-history">
        <h2 id="gratitude-history" className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Tes gratitudes récentes
        </h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center text-sm text-[var(--text-muted)]">
            Commence aujourd&apos;hui — même une seule ligne suffit.
          </div>
        ) : (
          <ul className="space-y-2" data-testid="gratitude-list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4"
              >
                <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{entry.content}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
