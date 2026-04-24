'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Subliminaux énergétiques — affichés >2s seulement (jamais flash visuel), opacity ~4%.
// Rotation 3s par mot. Mots adaptés à la locale (FR/EN/ES sinon fallback EN).
// Usage :
//   <SubliminalLoader />                  → auto activ (default active=true), apparaît après 2s
//   <SubliminalLoader active={isLoading} /> → piloté par parent
const SUBLIMINAL_WORDS: Record<string, string[]> = {
  fr: ['AMOUR', 'PUISSANCE', 'ABONDANCE', 'PAIX', 'CONFIANCE'],
  en: ['LOVE', 'POWER', 'ABUNDANCE', 'PEACE', 'TRUST'],
  es: ['AMOR', 'PODER', 'ABUNDANCIA', 'PAZ', 'CONFIANZA'],
}

const DEFAULT_DELAY_MS = 2000
const ROTATION_MS = 3000
const SUBLIMINAL_OPACITY = 0.045

function detectLocale(): string {
  if (typeof document === 'undefined') return 'fr'
  const lang = document.documentElement.lang?.slice(0, 2)?.toLowerCase()
  if (lang && SUBLIMINAL_WORDS[lang]) return lang
  return 'fr'
}

interface Props {
  active?: boolean
  delayMs?: number
}

export default function SubliminalLoader({
  active = true,
  delayMs = DEFAULT_DELAY_MS,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [locale, setLocale] = useState<string>('fr')

  useEffect(() => {
    setLocale(detectLocale())
  }, [])

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }
    const timer = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  useEffect(() => {
    if (!visible) return
    const words = SUBLIMINAL_WORDS[locale] ?? SUBLIMINAL_WORDS.fr
    const rotation = setInterval(() => {
      setWordIndex((i) => (i + 1) % words.length)
    }, ROTATION_MS)
    return () => clearInterval(rotation)
  }, [visible, locale])

  const words = SUBLIMINAL_WORDS[locale] ?? SUBLIMINAL_WORDS.fr
  const word = words[wordIndex % words.length]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="yana-subliminal"
          className="pointer-events-none fixed inset-0 z-[30] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: SUBLIMINAL_OPACITY }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          aria-hidden="true"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={word}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="select-none font-[family-name:var(--font-display)] text-[min(22vw,18rem)] font-thin uppercase tracking-[0.28em] text-[var(--text-primary)]"
            >
              {word}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
