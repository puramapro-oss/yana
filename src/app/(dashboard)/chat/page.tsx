'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/ui/Card'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  'Combien je peux récupérer en aides sociales ?',
  'Suis-je éligible à la CSS ?',
  'Mon employeur me doit-il les heures sup non payées ?',
  'Comment optimiser ma déclaration d\'impôts ?',
  'Je suis frontalier suisse, comment ça marche ?',
]

export default function ChatPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || loading || !profile) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: content.trim() }
    const assistantId = crypto.randomUUID()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)
    setStreamingId(assistantId)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok || !res.body) throw new Error('Erreur réseau')

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
          const payload = part.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const obj = JSON.parse(payload)
            if (obj.delta) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + obj.delta } : m)),
              )
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: '😕 Une erreur est survenue. Réessaie.' } : m)),
      )
    } finally {
      setLoading(false)
      setStreamingId(null)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col" data-testid="chat-page">
      <header className="mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
          NAMA-PILOTE <span className="text-base font-normal text-[var(--text-muted)]">— ton assistant juridique &amp; fiscal</span>
        </h1>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
        {messages.length === 0 ? (
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Salut {profile?.full_name?.split(' ')[0] ?? ''} 👋</p>
                <p className="text-xs text-[var(--text-muted)]">Pose-moi n&apos;importe quelle question sur tes droits, aides ou impôts.</p>
              </div>
            </div>
            <div className="grid gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-xl border border-[var(--border)] bg-white/[0.03] px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--cyan)]/40 hover:bg-white/5 hover:text-[var(--text-primary)]"
                  data-testid={`starter-${STARTERS.indexOf(s)}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] text-white">
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
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-[var(--cyan)]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || '…'}</ReactMarkdown>
                      {streamingId === m.id && <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[var(--cyan)]" />}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input)
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pose ta question…"
          className="flex-1 rounded-2xl border border-[var(--border)] bg-white/5 px-5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]/20"
          data-testid="chat-input"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
          data-testid="chat-send"
          aria-label="Envoyer"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
