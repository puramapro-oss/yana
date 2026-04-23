'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search, MessageSquare, ThumbsUp, ChevronDown, Loader2, Send, CheckCircle2,
  BookOpen, Sparkles, AlertCircle,
} from 'lucide-react'

interface FaqArticle {
  id: string
  category: string
  question: string
  answer: string
  search_keywords: string[]
  view_count: number
  helpful_count: number
  priority: number
}

interface FaqCategory {
  slug: string
  count: number
}

type ActiveTab = 'faq' | 'chat'

const CATEGORY_LABELS: Record<string, string> = {
  demarrage: 'Démarrage',
  'safety-score': 'Score de sécurité',
  graines: 'Graines 🌱',
  covoiturage: 'Covoiturage',
  'tree-planting': "Plantation d'arbres 🌳",
  kyc: "Vérification d'identité",
  fatigue: 'Fatigue & santé',
  moto: 'Mode Moto',
  'permis-points': 'Permis à points',
  assurance: 'Assurance',
  facturation: 'Abonnement & facturation',
  'retrait-wallet': 'Retraits & wallet',
  parrainage: 'Parrainage',
  'erreur-gps': 'Problèmes GPS',
  'suppression-compte': 'RGPD & suppression',
}

function labelForCategory(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, ' ')
}

function renderAnswer(md: string): string {
  // Rendu minimaliste : gras **x** → <strong>, retours ligne → <br>
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

interface ChatResult {
  resolved: boolean
  answer?: string | null
  confidence?: number | null
  ticket_id?: string
}

export default function AideClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('faq')
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<FaqArticle[]>([])
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [helpfulClicked, setHelpfulClicked] = useState<Record<string, boolean>>({})
  const viewTrackedRef = useRef<Set<string>>(new Set())

  // Chat state
  const [chatSubject, setChatSubject] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatName, setChatName] = useState('')
  const [chatEmail, setChatEmail] = useState('')
  const [chatSubmitting, setChatSubmitting] = useState(false)
  const [chatResult, setChatResult] = useState<ChatResult | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  const loadFaq = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const url = q ? `/api/faq?q=${encodeURIComponent(q)}` : '/api/faq'
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur de chargement.')
      setArticles(json.articles ?? [])
      setCategories(json.categories ?? [])
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFaq('')
  }, [loadFaq])

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim()
    const t = setTimeout(() => {
      loadFaq(trimmed)
    }, 300)
    return () => clearTimeout(t)
  }, [query, loadFaq])

  const grouped = useMemo(() => {
    const buckets: Record<string, FaqArticle[]> = {}
    for (const article of articles) {
      if (!buckets[article.category]) buckets[article.category] = []
      buckets[article.category].push(article)
    }
    return categories
      .map((cat) => ({ slug: cat.slug, articles: buckets[cat.slug] ?? [] }))
      .filter((group) => group.articles.length > 0)
  }, [articles, categories])

  const handleToggle = useCallback((article: FaqArticle) => {
    setExpandedId((current) => (current === article.id ? null : article.id))
    if (!viewTrackedRef.current.has(article.id)) {
      viewTrackedRef.current.add(article.id)
      fetch(`/api/faq/${article.id}/view`, { method: 'POST' }).catch(() => {
        viewTrackedRef.current.delete(article.id)
      })
    }
  }, [])

  const handleHelpful = useCallback(async (article: FaqArticle) => {
    if (helpfulClicked[article.id]) return
    setHelpfulClicked((prev) => ({ ...prev, [article.id]: true }))
    try {
      const res = await fetch(`/api/faq/${article.id}/helpful`, { method: 'POST' })
      if (!res.ok && res.status !== 409) {
        setHelpfulClicked((prev) => ({ ...prev, [article.id]: false }))
      }
    } catch {
      setHelpfulClicked((prev) => ({ ...prev, [article.id]: false }))
    }
  }, [helpfulClicked])

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
  }, [chatSubject, chatMessage, chatName, chatEmail])

  const resetChat = useCallback(() => {
    setChatResult(null)
    setChatError(null)
    setChatSubject('')
    setChatMessage('')
  }, [])

  return (
    <div className="mx-auto max-w-4xl">
      {/* Tabs */}
      <div className="mb-8 flex gap-2 rounded-full border border-[var(--border)] bg-white/[0.02] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          data-testid="aide-tab-faq"
          className={`flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'faq'
              ? 'bg-[var(--cyan)] text-black'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Questions fréquentes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          data-testid="aide-tab-chat"
          className={`flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'chat'
              ? 'bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Demander à NAMA Assistant
        </button>
      </div>

      {activeTab === 'faq' && (
        <div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cherche : covoiturage, score, retrait, arbre, KYC…"
              aria-label="Rechercher dans la FAQ"
              data-testid="aide-search"
              className="w-full rounded-full border border-[var(--border)] bg-white/[0.02] py-3 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]/40"
            />
          </div>

          {loading && articles.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement de la FAQ…
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center">
              <p className="text-4xl" aria-hidden>🔍</p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
                Aucun résultat pour « {query} »
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Essaie un autre mot-clé ou pose ta question directement à NAMA Assistant.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                data-testid="aide-cta-chat-from-empty"
              >
                <Sparkles className="h-4 w-4" />
                Poser ma question
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((group) => (
                <section key={group.slug} data-testid={`faq-section-${group.slug}`}>
                  <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                    {labelForCategory(group.slug)}
                  </h2>
                  <div className="space-y-2">
                    {group.articles.map((article) => {
                      const isOpen = expandedId === article.id
                      const voted = helpfulClicked[article.id] === true
                      return (
                        <article
                          key={article.id}
                          className="rounded-2xl border border-[var(--border)] bg-white/[0.02] transition-colors hover:border-white/15"
                          data-testid={`faq-article-${article.id}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggle(article)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                            aria-expanded={isOpen}
                          >
                            <span className="font-medium text-[var(--text-primary)]">
                              {article.question}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                              aria-hidden
                            />
                          </button>
                          {isOpen && (
                            <div className="border-t border-[var(--border)] px-5 py-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                              <p>{article.answer}</p>
                              <div className="mt-4 flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleHelpful(article)}
                                  disabled={voted}
                                  data-testid={`faq-helpful-${article.id}`}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    voted
                                      ? 'border-green-500/40 bg-green-500/10 text-green-400'
                                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-white/15 hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                  {voted ? 'Merci !' : 'Cette réponse est utile'}
                                </button>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {article.helpful_count + (voted ? 1 : 0)} personnes trouvent ça utile
                                </span>
                              </div>
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
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

                {/* Honeypot anti-spam — caché aux humains via CSS */}
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
      )}
    </div>
  )
}
