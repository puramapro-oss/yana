'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Send, Loader2, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/types'

interface ThreadMessage extends Pick<Message, 'id' | 'role' | 'content'> {
  /** local-only = créé côté client avant persistance DB */
  local?: boolean
}

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const conversationId = params?.id ?? null
  const autoStream = searchParams?.get('stream') === '1'

  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [title, setTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  const loadHistory = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/chat/${conversationId}`)
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(payload.error ?? 'Conversation indisponible.')
        return
      }
      setTitle(payload.conversation?.title ?? null)
      setMessages(
        ((payload.messages ?? []) as Message[])
          .filter((m) => m.role !== 'system')
          .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })),
      )
      scrollToBottom()
    } catch {
      setLoadError('Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }, [conversationId, scrollToBottom])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-refresh si ?stream=1 (page arrivée depuis /chat avec un message déjà
  // envoyé en arrière-plan, backend continue à persister → on polle jusqu'à
  // voir le message assistant apparaître)
  useEffect(() => {
    if (!autoStream) return
    const started = Date.now()
    const interval = setInterval(async () => {
      if (Date.now() - started > 30_000) {
        clearInterval(interval)
        return
      }
      const res = await fetch(`/api/chat/${conversationId}`).catch(() => null)
      if (!res || !res.ok) return
      const payload = await res.json().catch(() => null)
      if (!payload) return
      const fresh = ((payload.messages ?? []) as Message[]).filter((m) => m.role !== 'system')
      // Si dernier message est assistant = stream terminé côté serveur → stop polling
      const last = fresh[fresh.length - 1]
      setMessages(
        fresh.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      )
      scrollToBottom()
      if (last && last.role === 'assistant' && last.content.length > 0) {
        clearInterval(interval)
        // Clean l'URL pour retirer ?stream=1
        router.replace(`/chat/${conversationId}`)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [autoStream, conversationId, router, scrollToBottom])

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || sending || !conversationId) return

    const userMsg: ThreadMessage = {
      id: `local-u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      local: true,
    }
    const assistantId = `local-a-${Date.now()}`
    const assistantMsg: ThreadMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      local: true,
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setSending(true)
    setStreamingId(assistantId)
    scrollToBottom()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: [...messages.filter((m) => !m.local), userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}))
        toast.error(payload.error ?? 'NAMA-PILOTE est indisponible. Réessaie.')
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== assistantId))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const payloadStr = part.slice(6).trim()
          if (payloadStr === '[DONE]') continue
          try {
            const obj = JSON.parse(payloadStr) as {
              delta?: string
              error?: string
              conversation_id?: string
            }
            if (obj.error) {
              toast.error(obj.error)
            }
            if (obj.delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + obj.delta } : m,
                ),
              )
              scrollToBottom()
            }
          } catch {
            /* ignore parse errors — SSE tolérant */
          }
        }
      }

      // Recharger depuis la DB pour récupérer les vrais IDs serveur
      await loadHistory()
    } catch {
      toast.error('Connexion perdue. Réessaie.')
    } finally {
      setSending(false)
      setStreamingId(null)
    }
  }

  if (!conversationId || loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux conversations
        </Link>
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError ?? 'Conversation introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div
      className="mx-auto flex max-w-3xl flex-col"
      style={{ height: 'calc(100dvh - 9rem)' }}
      data-testid="chat-thread"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Conversations</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
          {title ?? 'NAMA-PILOTE'}
        </h1>
        <span aria-hidden className="w-16" />
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin"
        aria-live="polite"
      >
        {loading && (
          <>
            <div className="skeleton h-14 w-3/4 rounded-2xl" />
            <div className="skeleton ml-auto h-10 w-2/3 rounded-2xl" />
          </>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)]">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">Dis-moi ce qui se passe. Je t&apos;écoute.</p>
          </div>
        )}

        {!loading &&
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] text-white'
                    : 'glass border border-[var(--border)] text-[var(--text-primary)]'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-[var(--cyan)] prose-headings:text-[var(--text-primary)]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content || (streamingId === m.id ? '…' : '')}
                    </ReactMarkdown>
                    {streamingId === m.id && (
                      <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[var(--cyan)]" />
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input)
        }}
        className="mt-3 flex gap-2 pb-[env(safe-area-inset-bottom)]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pose ta question à NAMA-PILOTE…"
          className="flex-1 rounded-2xl border border-[var(--border)] bg-white/5 px-5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]/20"
          maxLength={2000}
          disabled={sending || loading}
          data-testid="chat-input"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || loading}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
          data-testid="chat-send"
          aria-label="Envoyer"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
