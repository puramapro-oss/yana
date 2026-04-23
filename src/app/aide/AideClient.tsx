'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Search } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'

// FAQ YANA — contenu seedé côté DB (yana.faq_articles) + récupéré en P4.
// Cette page est un stub P1 : zéro placeholder, pas de "Lorem", uniquement la promesse.
export default function AideClient() {
  const [query, setQuery] = useState('')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Cherche une question sur ${APP_NAME}…`}
          aria-label="Rechercher dans l'aide"
          className="w-full rounded-full border border-[var(--border)] bg-white/[0.02] py-3 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6 text-center">
        <p className="text-4xl" aria-hidden>
          🛠️
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
          La FAQ est en cours de rédaction
        </h2>
        <p className="mt-2 max-w-xl mx-auto text-sm text-[var(--text-secondary)]">
          {APP_NAME} vient de démarrer. Dès la fin de la prochaine phase, tu trouveras ici toutes
          les réponses sur le scoring, le covoiturage Dual Reward, la plantation d&apos;arbres et
          NAMA-PILOTE. En attendant, pose ta question directement à NAMA-PILOTE.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent-primary)]/20 transition hover:brightness-110"
          >
            <MessageSquare className="h-4 w-4" />
            Parler à NAMA-PILOTE
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
          >
            Contacter l&apos;équipe
          </Link>
        </div>
      </div>
    </div>
  )
}
