'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Step {
  targetTestId: string | null // null = étape intro/fin centrée sans cible
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'right' | 'left' | 'center'
}

const STEPS: Step[] = [
  {
    targetTestId: null,
    title: 'Bienvenue chez YANA 🛞',
    description: 'En 7 écrans, on te montre l\'essentiel. Chaque clic te fait gagner un peu plus.',
    placement: 'center',
  },
  {
    targetTestId: 'nav-drive',
    title: 'SAFE DRIVE — score de sécurité',
    description: 'Lance un trajet, YANA mesure ta conduite (freinage, vitesse) et te récompense en points.',
    placement: 'right',
  },
  {
    targetTestId: 'nav-green',
    title: 'GREEN DRIVE — plante des arbres',
    description: 'Tes km économisés en CO₂ plantent des arbres réels (traçabilité blockchain).',
    placement: 'right',
  },
  {
    targetTestId: 'nav-carpool',
    title: 'Covoiturage Dual Reward',
    description: 'Conducteur + passagers gagnent. 80% conducteur · 15% passagers · 5% Purama.',
    placement: 'right',
  },
  {
    targetTestId: 'nav-referral',
    title: 'Parrainage — 50% à vie',
    description: 'Ton code génère 50 % du premier paiement + 10 % à vie sur chaque filleul.',
    placement: 'right',
  },
  {
    targetTestId: 'nav-wallet',
    title: 'Portefeuille — retrait SEPA',
    description: 'Tes gains sont convertibles en euros dès 5€ sur ton IBAN.',
    placement: 'right',
  },
  {
    targetTestId: null,
    title: 'Tu es prêt·e 🚀',
    description: 'Lance ton premier trajet ou invite un·e ami·e. +50 pts pour ta 1ère action.',
    placement: 'center',
  },
]

const TUTORIAL_STORAGE_KEY = 'yana_tutorial_dismissed_at'

export default function TutorialOverlay() {
  const { user, profile } = useAuth()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)

  // Démarrage : si user connecté, profile fetched, tutorial pas completed en DB,
  // et pas dismissé localement récemment.
  useEffect(() => {
    if (!user || !profile) return
    if (profile.tutorial_completed) return
    try {
      const dismissedAt = window.localStorage.getItem(TUTORIAL_STORAGE_KEY)
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10)
        // On attend 10 minutes avant de reproposer si skip local
        if (Number.isFinite(elapsed) && elapsed < 10 * 60 * 1000) return
      }
    } catch {
      // pas d'accès localStorage — on affiche le tuto
    }
    // Démarre après que l'UI soit prête (intro dismissed, layout monté)
    const id = window.setTimeout(() => setActive(true), 1200)
    return () => window.clearTimeout(id)
  }, [user, profile])

  const currentStep = STEPS[stepIndex]

  // Mise à jour du rect de la cible à chaque step (et resize)
  const updateSpotlight = useCallback(() => {
    if (!active) return
    if (!currentStep.targetTestId) {
      setSpotlightRect(null)
      return
    }
    const el = document.querySelector(`[data-testid="${currentStep.targetTestId}"]`)
    if (el) {
      const rect = el.getBoundingClientRect()
      setSpotlightRect(rect)
    } else {
      setSpotlightRect(null)
    }
  }, [active, currentStep.targetTestId])

  useEffect(() => {
    if (!active) return
    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)
    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [active, updateSpotlight])

  async function markCompletedInDb() {
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorial_completed: true }),
      })
    } catch {
      // silent — local flag quand même mis
    }
  }

  function finish(markCompleted: boolean) {
    setActive(false)
    try {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, String(Date.now()))
    } catch {
      // silent
    }
    if (markCompleted) {
      void markCompletedInDb()
    }
  }

  function next() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      finish(true)
    }
  }

  function prev() {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }

  if (!active) return null

  return (
    <AnimatePresence>
      <motion.div
        key="tutorial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1500]"
        role="dialog"
        aria-label="Tutoriel YANA"
        data-testid="tutorial-overlay"
      >
        {/* SVG mask noir avec trou sur la cible */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <mask id="tutorial-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={Math.max(0, spotlightRect.left - 6)}
                  y={Math.max(0, spotlightRect.top - 6)}
                  width={spotlightRect.width + 12}
                  height={spotlightRect.height + 12}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(10, 10, 15, 0.85)"
            mask="url(#tutorial-spotlight-mask)"
            style={{ backdropFilter: 'blur(2px)' }}
          />
          {spotlightRect && (
            <rect
              x={Math.max(0, spotlightRect.left - 6)}
              y={Math.max(0, spotlightRect.top - 6)}
              width={spotlightRect.width + 12}
              height={spotlightRect.height + 12}
              rx="12"
              ry="12"
              fill="none"
              stroke="var(--cyan)"
              strokeWidth="2"
              opacity="0.85"
            />
          )}
        </svg>

        {/* Carte d'info — positionnement intelligent selon placement/rect */}
        <motion.div
          key={stepIndex}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto absolute left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--bg-nebula)]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
          style={(() => {
            if (!spotlightRect || currentStep.placement === 'center') return {}
            // Placement à droite de la cible si elle est dans le viewport desktop
            const vw = window.innerWidth
            if (currentStep.placement === 'right' && spotlightRect.right + 320 < vw) {
              return {
                left: `${spotlightRect.right + 24}px`,
                top: `${spotlightRect.top + spotlightRect.height / 2}px`,
                transform: 'translateY(-50%)',
              }
            }
            return {}
          })()}
        >
          <div className="flex items-start gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cyan)]/15 text-[var(--cyan)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Étape {stepIndex + 1} / {STEPS.length}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                {currentStep.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => finish(false)}
              aria-label="Fermer le tutoriel"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              data-testid="tutorial-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {currentStep.description}
          </p>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              data-testid="tutorial-prev"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => finish(true)}
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                data-testid="tutorial-skip"
              >
                Passer tout
              </button>
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                data-testid="tutorial-next"
              >
                {stepIndex === STEPS.length - 1 ? 'Terminer' : 'Suivant'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
