'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MessageSquare, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/utils'

interface ConversationItem {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  preview: string | null
  preview_role: string | null
}

const STARTERS = [
  "Je roule 2h demain, comment éviter la fatigue ?",
  "Comment économiser du carburant sur autoroute ?",
  "Comment organiser un covoiturage avec 3 passagers ?",
  "Mon stress au volant monte vite, comment respirer ?",
  "Quelle éco-conduite pour ma voiture essence ?",
]

export default function ChatListPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/chat/conversations')
        const payload = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(payload.error ?? 'Impossible de charger tes conversations.')
        } else {
          setConversations((payload.conversations ?? []) as ConversationItem[])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function startWith(content: string) {
    if (starting) return
    setStarting(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content }] }),
      })
      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}))
        toast.error(payload.error ?? 'NAMA-PILOTE est indisponible. Réessaie.')
        setStarting(false)
        return
      }

      // On lit juste le premier event SSE pour récupérer conversation_id, puis redirect.
      // Le thread /chat/[id] reprendra le stream en polling l'historique (pattern simple).
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let conversationId: string | null = null

      while (!conversationId) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const payloadStr = part.slice(6).trim()
          if (payloadStr === '[DONE]') break
          try {
            const obj = JSON.parse(payloadStr) as { conversation_id?: string }
            if (obj.conversation_id) {
              conversationId = obj.conversation_id
              break
            }
          } catch {
            /* ignore */
          }
        }
      }

      // On coupe la lecture : le backend continue à stream + persister le message assistant.
      // La page thread rechargera les messages en polling (3 sec max).
      try { await reader.cancel() } catch { /* noop */ }

      if (conversationId) {
        router.push(`/chat/${conversationId}?stream=1`)
      } else {
        toast.error("NAMA-PILOTE n'a pas pu démarrer la conversation.")
      }
    } catch {
      toast.error('Connexion impossible. Vérifie ton réseau.')
    } finally {
      setStarting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette conversation définitivement ?')) return
    const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      toast.success('Conversation supprimée.')
    } else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.error ?? 'Suppression impossible.')
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            NAMA-PILOTE
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Ton copilote IA — sécurité routière, écoconduite, sagesse du voyage.
          </p>
        </div>
        <Link
          href="#starters"
          className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/20 transition hover:brightness-110 sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          Nouvelle conversation
        </Link>
      </header>

      {/* Starters (démarrage rapide) */}
      <section
        id="starters"
        aria-labelledby="starters-title"
        className="mb-8 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p id="starters-title" className="font-semibold text-[var(--text-primary)]">
              Salut {firstName} 👋
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Une question pour démarrer ? Ou pose la tienne.
            </p>
          </div>
        </div>
        <ul className="grid gap-2">
          {STARTERS.map((s, i) => (
            <li key={s}>
              <button
                onClick={() => startWith(s)}
                disabled={starting}
                data-testid={`chat-starter-${i}`}
                className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] transition hover:border-[var(--cyan)]/40 hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
        <CustomStarter onSubmit={startWith} disabled={starting} />
      </section>

      {/* Liste des conversations */}
      <section aria-labelledby="conv-title">
        <h2 id="conv-title" className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">
          Historique
        </h2>

        {loading && (
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </ul>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--border)] bg-white/[0.01] p-6 text-center text-sm text-[var(--text-muted)]">
            Aucune conversation pour l&apos;instant. Lance-en une avec une des suggestions ci-dessus.
          </p>
        )}

        {!loading && !error && conversations.length > 0 && (
          <ul className="space-y-2" data-testid="chat-list">
            {conversations.map((c) => (
              <li
                key={c.id}
                className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 transition hover:border-[var(--border-glow)] hover:bg-white/[0.04]"
              >
                <Link href={`/chat/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {c.title ?? 'Conversation sans titre'}
                    </p>
                    {c.preview && (
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {c.preview_role === 'user' ? '🧑 ' : '🛞 '}
                        {c.preview}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {formatDateTime(c.updated_at)}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  aria-label={`Supprimer ${c.title ?? 'cette conversation'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CustomStarter({
  onSubmit,
  disabled,
}: {
  onSubmit: (content: string) => void
  disabled: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!value.trim()) return
        onSubmit(value.trim())
        setValue('')
      }}
      className="mt-3 flex gap-2"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ou écris ta propre question…"
        className="flex-1 rounded-xl border border-[var(--border)] bg-white/[0.02] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]/30"
        maxLength={500}
        data-testid="chat-starter-custom"
      />
      <Button type="submit" variant="primary" size="sm" disabled={disabled || !value.trim()}>
        Envoyer
      </Button>
    </form>
  )
}
