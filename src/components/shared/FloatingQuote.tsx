'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Quote, X } from 'lucide-react'

// Citations voyage — Rumi (mystique), Bashō (pèlerin), Lao Tseu (Tao), Saint-Exupéry (pilote).
// Rotation toutes les 30 minutes. Index initial déterministe par date UTC (partage avec TravelQuote).
// Bulle bas-droit 280px, fermable (persist localStorage). Fade 800ms par rotation.
const QUOTE_KEYS = ['rumi', 'basho', 'laozi', 'saint_exupery'] as const

const ROTATION_MS = 30 * 60 * 1000 // 30 minutes
const SHOW_DELAY_MS = 6000 // Apparition après l'initial load (post affirmation + post LCP)
const DISMISSED_KEY = 'yana-floating-quote-dismissed'

function todayStartIndex(): number {
  const now = new Date()
  const daysSinceEpoch = Math.floor(now.getTime() / 86_400_000)
  return daysSinceEpoch % QUOTE_KEYS.length
}

export default function FloatingQuote() {
  const t = useTranslations('home.quotes')
  const [index, setIndex] = useState<number>(() => todayStartIndex())
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DISMISSED_KEY)
      if (stored === '1') {
        setDismissed(true)
        return
      }
    } catch {
      // localStorage bloqué — on masque
      return
    }
    setDismissed(false)

    const showTimer = setTimeout(() => setMounted(true), SHOW_DELAY_MS)
    const rotation = setInterval(() => {
      setIndex((current) => (current + 1) % QUOTE_KEYS.length)
    }, ROTATION_MS)

    return () => {
      clearTimeout(showTimer)
      clearInterval(rotation)
    }
  }, [])

  function close() {
    setMounted(false)
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // silencieux
    }
  }

  if (dismissed) return null

  const key = QUOTE_KEYS[index]

  return (
    <AnimatePresence>
      {mounted && (
        <motion.aside
          key="yana-floating-quote"
          role="complementary"
          aria-label="Citation voyage"
          className="pointer-events-none fixed bottom-24 right-4 z-[60] w-[min(280px,calc(100vw-2rem))] lg:bottom-6 lg:right-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pointer-events-auto group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--bg-secondary)]/90 p-4 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={close}
              aria-label="Fermer la citation"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition hover:bg-white/10 hover:text-[var(--text-primary)] group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <Quote className="h-4 w-4 text-[#7C3AED]/70" aria-hidden="true" />

            <AnimatePresence mode="wait">
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <p className="mt-2 font-[family-name:var(--font-display)] text-sm italic leading-snug text-[var(--text-secondary)]">
                  « {t(`${key}.text`)} »
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  — {t(`${key}.author`)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
