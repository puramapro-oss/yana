'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, Send, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react'
import type { ChatResult } from './types'
import { renderAnswer } from './types'

type Props = {
  chatSubject: string
  setChatSubject: (s: string) => void
  chatMessage: string
  setChatMessage: (s: string) => void
  chatName: string
  setChatName: (s: string) => void
  chatEmail: string
  setChatEmail: (s: string) => void
  chatSubmitting: boolean
  chatResult: ChatResult | null
  setChatResult: (r: ChatResult | null) => void
  chatError: string | null
  setChatError: (e: string | null) => void
  setChatSubmitting: (b: boolean) => void
}

export default function AideChatSection({
  chatSubject,
  setChatSubject,
  chatMessage,
  setChatMessage,
  chatName,
  setChatName,
  chatEmail,
  setChatEmail,
  chatSubmitting,
  chatResult,
  setChatResult,
  chatError,
  setChatError,
  setChatSubmitting,
}: Props) {
  const handleChatSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setChatError(null)
    setChatResult(null)

    if (chatSubject.trim().length < 3) {
      setChatError('Sujet trop court (min 3 caractères).')
      return
    }
    if (chatMessage.trim().length < 10) {
      setChatError('Message trop court (min 10 caractères).')
      return
    }

    setChatSubmitting(true)
    try {
      const payload: Record<string, string> = {
        subject: chatSubject.trim(),
        message: chatMessage.trim(),
      }
      if (chatName.trim()) payload.guest_name = chatName.trim()
      if (chatEmail.trim()) payload.guest_email = chatEmail.trim()

      const res = await fetch('/api/support/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setChatError(json.error ?? "Envoi impossible. Réessaie dans quelques instants.")
        return
      }
      setChatResult({
        resolved: Boolean(json.resolved),
        answer: json.answer ?? null,
        confidence: json.confidence ?? null,
        ticket_id: json.ticket_id,
      })
      if (json.resolved) {
        setChatSubject('')
        setChatMessage('')
      }
    } catch {
      setChatError('Envoi impossible. Réessaie dans quelques instants.')
    } finally {
      setChatSubmitting(false)
    }
  }, [chatSubject, chatMessage, chatName, chatEmail, setChatError, setChatResult, setChatSubmitting, setChatSubject, setChatMessage])

  const resetChat = useCallback(() => {
    setChatResult(null)
    setChatError(null)
    setChatSubject('')
    setChatMessage('')
  }, [setChatResult, setChatError, setChatSubject, setChatMessage])

  return (
    <div className="space-y-5">
      {chatResult?.resolved && chatResult.answer && (
        <div
          className="rounded-2xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 p-6"
          data-testid="aide-chat-answer"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">NAMA Assistant répond</span>
            {chatResult.confidence !== null && chatResult.confidence !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">
                · confiance {Math.round(chatResult.confidence * 100)}%
              </span>
            )}
          </div>
          <div
            className="text-sm leading-relaxed text-[var(--text-primary)]"
            dangerouslySetInnerHTML={{ __html: renderAnswer(chatResult.answer) }}
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
            >
              Poser une autre question
            </button>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/10"
            >
              Contacter l&apos;équipe humaine
            </Link>
          </div>
        </div>
      )}

      {chatResult && !chatResult.resolved && (
        <div
          className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6 text-center"
          data-testid="aide-chat-escalated"
        >
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
            Message transmis 🙏
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            NAMA Assistant n&apos;a pas pu répondre avec certitude — un humain de l&apos;équipe
            YANA te répond par email sous 24h ouvrées.
          </p>
          {chatResult.ticket_id && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Référence : <code className="rounded bg-white/5 px-2 py-0.5">{chatResult.ticket_id.slice(0, 8)}</code>
            </p>
          )}
          <button
            type="button"
            onClick={resetChat}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
          >
            Poser une autre question
          </button>
        </div>
      )}

      {!chatResult && (
        <form
          onSubmit={handleChatSubmit}
          className="rounded-3xl border border-[var(--border)] bg-white/[0.02] p-6 md:p-8 space-y-4"
          data-testid="aide-chat-form"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">NAMA Assistant</p>
              <p className="text-xs text-[var(--text-muted)]">
                Réponse instantanée si la FAQ couvre ta question, sinon escalade humaine sous 24h.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="chat-name" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
                  Ton prénom <span className="text-[var(--text-muted)]">(si non connecté)</span>
                </label>
                <input
                  id="chat-name"
                  type="text"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="Alex"
                  className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="chat-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
                  Ton email <span className="text-[var(--text-muted)]">(si non connecté)</span>
                </label>
                <input
                  id="chat-email"
                  type="email"
                  value={chatEmail}
                  onChange={(e) => setChatEmail(e.target.value)}
                  placeholder="toi@domaine.fr"
                  className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="chat-subject" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
                Sujet
              </label>
              <input
                id="chat-subject"
                type="text"
                value={chatSubject}
                onChange={(e) => setChatSubject(e.target.value)}
                placeholder="Ex. Comment retirer mes gains ?"
                required
                minLength={3}
                maxLength={120}
                data-testid="aide-chat-subject"
                className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="chat-message" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
                Ta question
              </label>
              <textarea
                id="chat-message"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Explique ta situation, plus c'est précis, mieux je réponds."
                required
                rows={5}
                minLength={10}
                maxLength={4000}
                data-testid="aide-chat-message"
                className="w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none"
              />
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            {chatError && (
              <div
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                role="alert"
                data-testid="aide-chat-error"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{chatError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={chatSubmitting}
              data-testid="aide-chat-submit"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {chatSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  NAMA réfléchit…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer à NAMA Assistant
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="text-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Parler à NAMA-PILOTE (coach de route)
        </Link>
      </div>
    </div>
  )
}
