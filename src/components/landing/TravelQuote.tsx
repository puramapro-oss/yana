'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

// Citations voyage — Rumi (mystique), Bashō (pèlerin), Lao Tseu (Tao), Saint-Exupéry (pilote).
// Rotation déterministe par date UTC = mêmes citations toute la journée pour tout le monde,
// changent chaque jour. Clés i18n dans home.quotes.* (4 auteurs × text + author).
const QUOTE_KEYS = ['rumi', 'basho', 'laozi', 'saint_exupery'] as const

function todayIndex(): number {
  const now = new Date()
  const daysSinceEpoch = Math.floor(now.getTime() / 86_400_000)
  return daysSinceEpoch % QUOTE_KEYS.length
}

export default function TravelQuote() {
  const t = useTranslations('home.quotes')
  const key = useMemo(() => QUOTE_KEYS[todayIndex()], [])

  return (
    <blockquote className="mx-auto max-w-2xl text-center">
      <p className="font-[family-name:var(--font-display)] text-lg italic leading-relaxed text-[var(--text-secondary)] sm:text-xl">
        &ldquo; {t(`${key}.text`)} &rdquo;
      </p>
      <footer className="mt-3 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
        — {t(`${key}.author`)}
      </footer>
    </blockquote>
  )
}
