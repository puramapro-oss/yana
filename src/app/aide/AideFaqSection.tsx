'use client'

import { useCallback, useMemo } from 'react'
import { Search, Loader2, ThumbsUp, ChevronDown, Sparkles } from 'lucide-react'
import type { FaqArticle, FaqCategory } from './types'
import { labelForCategory } from './types'

type Props = {
  query: string
  setQuery: (q: string) => void
  articles: FaqArticle[]
  categories: FaqCategory[]
  loading: boolean
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
  helpfulClicked: Record<string, boolean>
  setHelpfulClicked: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  viewTrackedRef: React.MutableRefObject<Set<string>>
  setActiveTab: (tab: 'faq' | 'chat') => void
}

export default function AideFaqSection({
  query,
  setQuery,
  articles,
  categories,
  loading,
  expandedId,
  setExpandedId,
  helpfulClicked,
  setHelpfulClicked,
  viewTrackedRef,
  setActiveTab,
}: Props) {
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
  }, [setExpandedId, viewTrackedRef])

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
  }, [helpfulClicked, setHelpfulClicked])

  return (
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
  )
}
