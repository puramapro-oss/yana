'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playBowl } from '@/lib/sacred-sound'

// Célébration visuelle + sonore à chaque achievement débloqué.
// Écoute CustomEvent `yana:achievement-unlocked` déclenché côté client
// (voir src/app/(dashboard)/achievements/page.tsx qui compare l'état précédent
// en localStorage et dispatch pour chaque nouveau débloqué).

interface AchievementPayload {
  title: string
  rarity?: string
}

const CELEBRATION_DURATION_MS = 4000

export default function LotusCelebration() {
  const [celebration, setCelebration] = useState<AchievementPayload | null>(null)

  useEffect(() => {
    function onUnlock(event: Event) {
      const detail = (event as CustomEvent<AchievementPayload>).detail
      if (!detail || typeof detail.title !== 'string') return
      setCelebration(detail)
      void playBowl()
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function'
      ) {
        try {
          navigator.vibrate([40, 60, 120])
        } catch {
          // silencieux
        }
      }
      window.setTimeout(() => setCelebration(null), CELEBRATION_DURATION_MS)
    }

    window.addEventListener('yana:achievement-unlocked', onUnlock)
    return () => {
      window.removeEventListener('yana:achievement-unlocked', onUnlock)
    }
  }, [])

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key="yana-lotus-celebration"
          className="pointer-events-none fixed inset-0 z-[85] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          aria-live="polite"
        >
          <div className="absolute inset-0 bg-gradient-radial from-[#7C3AED]/15 via-transparent to-transparent" />
          <motion.div
            className="relative flex flex-col items-center gap-6"
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.08, opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              animate={{ rotate: [0, 8, -4, 0] }}
              transition={{ duration: 2.8, ease: 'easeInOut' }}
            >
              <LotusSvg />
            </motion.div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-[#7C3AED]/80">
                Achievement débloqué
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                {celebration.title}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LotusSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      width={180}
      height={180}
      aria-hidden="true"
      className="drop-shadow-[0_0_32px_rgba(124,58,237,0.45)]"
    >
      <defs>
        <linearGradient id="lotus-petal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id="lotus-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(100 100)">
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 360) / 8
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <path
                d="M 0 -18 C -20 -45 -20 -78 0 -88 C 20 -78 20 -45 0 -18 Z"
                fill="url(#lotus-petal)"
                stroke="#fff"
                strokeOpacity="0.2"
                strokeWidth="0.8"
              />
            </g>
          )
        })}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 360) / 8 + 22.5
          return (
            <g key={`inner-${i}`} transform={`rotate(${angle})`}>
              <path
                d="M 0 -10 C -12 -30 -12 -55 0 -62 C 12 -55 12 -30 0 -10 Z"
                fill="url(#lotus-petal)"
                fillOpacity="0.75"
              />
            </g>
          )
        })}
        <circle r="14" fill="url(#lotus-center)" />
      </g>
    </svg>
  )
}
