'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { APP_NAME } from '@/lib/constants'

const INTRO_STORAGE_KEY = 'yana_intro_seen'

/**
 * Cinématique d'accueil affichée une seule fois au premier accès dashboard.
 * Séquence (3.5s) :
 *   0.0s → logo roue
 *   0.8s → nom app gradient
 *   1.5s → tagline "Le karma de la route"
 *   2.3s → CTA commencer
 *   skip toujours dispo
 */
export default function CinematicIntro() {
  const [shown, setShown] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(INTRO_STORAGE_KEY)
      setShown(seen !== '1')
    } catch {
      setShown(false)
    }
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, '1')
    } catch {
      // localStorage bloqué — on masque pour cette session
    }
    setShown(false)
  }

  if (shown !== true) return null

  return (
    <AnimatePresence>
      <motion.div
        key="yana-intro-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[2000] grid place-items-center bg-[var(--bg-nebula)]"
        role="dialog"
        aria-label="Introduction YANA"
        data-testid="cinematic-intro"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--cyan)]/15 blur-3xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--purple)]/20 blur-3xl"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 1 }}
            transition={{ duration: 2.8, ease: 'easeOut', delay: 0.3 }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <motion.div
            initial={{ scale: 0.3, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
            className="text-7xl drop-shadow-[0_0_30px_rgba(34,197,244,0.5)] sm:text-8xl"
            aria-hidden
          >
            🛞
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="gradient-text font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight sm:text-7xl"
          >
            {APP_NAME}
          </motion.h1>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="max-w-md text-sm text-[var(--text-secondary)] sm:text-base"
          >
            Le karma de la route. Chaque trajet est un chapitre de ta légende.
          </motion.p>

          <motion.button
            type="button"
            onClick={dismiss}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.3, duration: 0.5 }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/30 transition hover:brightness-110 active:scale-95"
            data-testid="intro-start"
          >
            Commencer →
          </motion.button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full border border-[var(--border)] bg-white/5 px-4 py-2 text-xs text-[var(--text-secondary)] backdrop-blur hover:bg-white/10 hover:text-[var(--text-primary)]"
          data-testid="intro-skip"
          aria-label="Passer l'introduction"
        >
          Passer
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
