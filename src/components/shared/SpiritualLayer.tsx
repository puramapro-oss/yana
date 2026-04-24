'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { isSoundEnabled, resumeLoopIfEnabled } from '@/lib/sacred-sound'

interface Affirmation {
  id: string
  category: string
  text: string
}

const CATEGORY_BADGE: Record<string, string> = {
  love: '💗 Amour',
  power: '⚡ Puissance',
  abundance: '✨ Abondance',
  health: '🌿 Santé',
  wisdom: '🦉 Sagesse',
  gratitude: '🙏 Gratitude',
  journey: '🛞 Voyage',
  safety: '🛡️ Sécurité',
}

function todayKey(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `yana-spiritual-affirmation-${y}${m}${day}`
}

const OPEN_DELAY_MS = 2200
const AUTO_DISMISS_MS = 12000
const RESPIRE_INTERVAL_MS = 25 * 60 * 1000 // 25 minutes
const RESPIRE_AUTO_DISMISS_MS = 3000

export default function SpiritualLayer() {
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null)
  const [visible, setVisible] = useState(false)
  const [respireVisible, setRespireVisible] = useState(false)

  const close = useCallback(() => {
    setVisible(false)
    try {
      window.localStorage.setItem(todayKey(), '1')
    } catch {
      // localStorage bloqué — on masque pour la session uniquement
    }
  }, [])

  const closeRespire = useCallback(() => {
    setRespireVisible(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    let openTimer: ReturnType<typeof setTimeout> | null = null
    let dismissTimer: ReturnType<typeof setTimeout> | null = null

    try {
      if (window.localStorage.getItem(todayKey())) return
    } catch {
      return
    }

    openTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/affirmations/today')
        if (!res.ok || cancelled) return
        const json = (await res.json()) as Affirmation
        if (cancelled) return
        setAffirmation(json)
        setVisible(true)
        dismissTimer = setTimeout(() => {
          if (!cancelled) close()
        }, AUTO_DISMISS_MS)
      } catch {
        // Silencieux : user reverra l'affirmation au prochain chargement
      }
    }, OPEN_DELAY_MS)

    return () => {
      cancelled = true
      if (openTimer) clearTimeout(openTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [close])

  // Sons 432Hz : si activés par l'user, reprend la boucle au premier geste utilisateur
  // (contourne la politique autoplay Chrome/Safari).
  useEffect(() => {
    if (!isSoundEnabled()) return

    const unlock = () => {
      void resumeLoopIfEnabled()
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Pause cœur : overlay "Respire." toutes les 25min, auto-dismiss 3s.
  useEffect(() => {
    let autoDismiss: ReturnType<typeof setTimeout> | null = null

    const triggerRespire = () => {
      setRespireVisible(true)
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([120, 80, 120])
        }
      } catch {
        // vibrate bloqué / non supporté — silencieux
      }
      if (autoDismiss) clearTimeout(autoDismiss)
      autoDismiss = setTimeout(() => setRespireVisible(false), RESPIRE_AUTO_DISMISS_MS)
    }

    const interval = setInterval(triggerRespire, RESPIRE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      if (autoDismiss) clearTimeout(autoDismiss)
    }
  }, [])

  return (
    <>
      <AnimatePresence>
        {respireVisible && (
          <motion.div
            key="yana-spiritual-respire"
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[75] flex cursor-pointer items-center justify-center bg-black/85 backdrop-blur-2xl"
            onClick={closeRespire}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              className="pointer-events-none select-none text-center"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.p
                className="bg-gradient-to-br from-[#7C3AED] via-white to-[#0EA5E9] bg-clip-text font-[family-name:var(--font-display)] text-6xl font-light tracking-wide text-transparent sm:text-7xl"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
              >
                Respire.
              </motion.p>
              <p className="mt-4 text-xs uppercase tracking-[0.4em] text-white/40">
                Une pause pour toi
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && affirmation && (
        <motion.div
          key="yana-spiritual-affirmation"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spiritual-affirmation-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
          />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/15 via-[var(--bg-primary)] to-[#0EA5E9]/15 p-6 shadow-2xl sm:p-8"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text-primary)]"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] shadow-lg shadow-[#7C3AED]/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    id="spiritual-affirmation-title"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    Affirmation du jour
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {CATEGORY_BADGE[affirmation.category] ?? affirmation.category}
                  </span>
                </div>
                <p className="mt-3 font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--text-primary)]">
                  « {affirmation.text} »
                </p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Inspire profondément. Laisse cette intention imprégner ton trajet.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Merci ✨
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  )
}
