'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import type { FaqArticle, FaqCategory, ActiveTab, ChatResult } from './types'
import AideFaqSection from './AideFaqSection'
import AideChatSection from './AideChatSection'

export default function AideClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('faq')
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<FaqArticle[]>([])
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [helpfulClicked, setHelpfulClicked] = useState<Record<string, boolean>>({})
  const viewTrackedRef = useRef<Set<string>>(new Set())

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

  useEffect(() => {
    loadFaq('')
  }, [loadFaq])

  useEffect(() => {
    const trimmed = query.trim()
    const t = setTimeout(() => {
      loadFaq(trimmed)
    }, 300)
    return () => clearTimeout(t)
  }, [query, loadFaq])

  return (
    <div className="mx-auto max-w-4xl">
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
        <AideFaqSection
          query={query}
          setQuery={setQuery}
          articles={articles}
          categories={categories}
          loading={loading}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          helpfulClicked={helpfulClicked}
          setHelpfulClicked={setHelpfulClicked}
          viewTrackedRef={viewTrackedRef}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'chat' && (
        <AideChatSection
          chatSubject={chatSubject}
          setChatSubject={setChatSubject}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          chatName={chatName}
          setChatName={setChatName}
          chatEmail={chatEmail}
          setChatEmail={setChatEmail}
          chatSubmitting={chatSubmitting}
          chatResult={chatResult}
          setChatResult={setChatResult}
          chatError={chatError}
          setChatError={setChatError}
          setChatSubmitting={setChatSubmitting}
        />
      )}
    </div>
  )
}
