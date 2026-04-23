'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, Wind, CheckCircle2 } from 'lucide-react'

// Protocole 4-7-8 Dr Andrew Weil :
// - Inspire 4s (par le nez)
// - Retiens 7s
// - Expire 8s (par la bouche, sifflé léger)
// 1 cycle = 19s. 4 cycles recommandés.
const CYCLE_SECONDS = 19
const DEFAULT_CYCLES = 4

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'done'

interface PhaseInfo {
  label: string
  seconds: number
  color: string
  scale: number
  instruction: string
}

const PHASES: Record<Exclude<Phase, 'idle' | 'done'>, PhaseInfo> = {
  inhale: {
    label: 'Inspire',
    seconds: 4,
    color: '#0EA5E9',
    scale: 1.5,
    instruction: 'Inspire lentement par le nez',
  },
  hold: {
    label: 'Retiens',
    seconds: 7,
    color: '#7C3AED',
    scale: 1.5,
    instruction: 'Retiens ton souffle, détends-toi',
  },
  exhale: {
    label: 'Expire',
    seconds: 8,
    color: '#F97316',
    scale: 0.85,
    instruction: 'Expire longuement par la bouche',
  },
}

export default function BreatheClient() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0)
  const [cycleIndex, setCycleIndex] = useState(0)
  const [totalCycles, setTotalCycles] = useState(DEFAULT_CYCLES)
  const [xpEarned, setXpEarned] = useState<number | null>(null)
  const [logError, setLogError] = useState<string | null>(null)
  const startedAtRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const logSession = useCallback(async (durationSec: number) => {
    try {
      const res = await fetch('/api/breath', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: '4-7-8', duration_sec: durationSec }),
      })
      const json = await res.json()
      if (!res.ok) {
        setLogError(json.error ?? 'Erreur log session')
        return
      }
      setXpEarned(json.xp_earned ?? 0)
    } catch {
      setLogError('Session non loguée (mode offline ?)')
    }
  }, [])

  const tickPhase = useCallback((current: Exclude<Phase, 'idle' | 'done'>, secondsLeft: number, cycle: number) => {
    setPhase(current)
    setPhaseSecondsLeft(secondsLeft)
    if (secondsLeft <= 0) {
      // Transition suivante
      if (current === 'inhale') {
        tickPhase('hold', PHASES.hold.seconds, cycle)
        return
      }
      if (current === 'hold') {
        tickPhase('exhale', PHASES.exhale.seconds, cycle)
        return
      }
      // exhale → fin cycle
      const next = cycle + 1
      setCycleIndex(next)
      if (next >= totalCycles) {
        setPhase('done')
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000)
        logSession(durationSec)
        return
      }
      tickPhase('inhale', PHASES.inhale.seconds, next)
      return
    }
    timeoutRef.current = setTimeout(() => {
      tickPhase(current, secondsLeft - 1, cycle)
    }, 1000)
  }, [totalCycles, logSession])

  const start = useCallback(() => {
    clearTimer()
    setXpEarned(null)
    setLogError(null)
    setCycleIndex(0)
    startedAtRef.current = Date.now()
    tickPhase('inhale', PHASES.inhale.seconds, 0)
  }, [clearTimer, tickPhase])

  const stop = useCallback(() => {
    clearTimer()
    setPhase('idle')
    setPhaseSecondsLeft(0)
    setCycleIndex(0)
  }, [clearTimer])

  useEffect(() => () => clearTimer(), [clearTimer])

  const isActive = phase === 'inhale' || phase === 'hold' || phase === 'exhale'
  const active = isActive ? PHASES[phase] : null

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#7C3AED]">
          <Wind className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
          Respiration 4-7-8
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Protocole du Dr Andrew Weil — 1 min avant un long trajet. Calme instantané.
        </p>
      </header>

      <section className="glass flex flex-col items-center gap-6 rounded-3xl p-8 sm:p-12">
        <div className="relative flex h-64 w-64 items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full transition-all ease-in-out"
            style={{
              background: `radial-gradient(circle, ${active?.color ?? '#0EA5E9'}33 0%, transparent 70%)`,
              transform: `scale(${active?.scale ?? 1})`,
              transitionDuration: active
                ? phase === 'inhale'
                  ? '4000ms'
                  : phase === 'exhale'
                    ? '8000ms'
                    : '0ms'
                : '300ms',
            }}
          />
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all ease-in-out"
            style={{
              borderColor: active?.color ?? 'var(--border)',
              transform: `scale(${active?.scale ?? 1})`,
              transitionDuration: active
                ? phase === 'inhale'
                  ? '4000ms'
                  : phase === 'exhale'
                    ? '8000ms'
                    : '0ms'
                : '300ms',
              background: `${active?.color ?? 'transparent'}20`,
            }}
          >
            <div className="text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
                {active ? active.label : phase === 'done' ? 'Terminé' : 'Prêt ?'}
              </p>
              {isActive && (
                <p className="text-sm text-[var(--text-muted)]">{phaseSecondsLeft}s</p>
              )}
            </div>
          </div>
        </div>

        {isActive && active && (
          <p className="text-center text-sm text-[var(--text-secondary)]" data-testid="breathe-instruction">
            {active.instruction}
          </p>
        )}

        <div className="flex items-center gap-3">
          {!isActive && phase !== 'done' && (
            <div className="flex items-center gap-2">
              <label htmlFor="cycles" className="text-xs text-[var(--text-muted)]">
                Cycles :
              </label>
              <select
                id="cycles"
                value={totalCycles}
                onChange={(e) => setTotalCycles(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-1.5 text-sm text-[var(--text-primary)]"
              >
                <option value={2}>2 (≈38s)</option>
                <option value={4}>4 (≈76s)</option>
                <option value={6}>6 (≈1m54s)</option>
                <option value={8}>8 (≈2m32s)</option>
              </select>
            </div>
          )}
          {isActive ? (
            <button
              type="button"
              onClick={stop}
              data-testid="breathe-stop"
              className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
            >
              <Square className="h-4 w-4" />
              Arrêter
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              data-testid="breathe-start"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              <Play className="h-4 w-4" />
              {phase === 'done' ? 'Recommencer' : `Démarrer (${totalCycles} cycles)`}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Cycle {Math.min(cycleIndex, totalCycles)} / {totalCycles} — {CYCLE_SECONDS}s par cycle
        </p>

        {phase === 'done' && (
          <div
            className="flex flex-col items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center"
            data-testid="breathe-done"
          >
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {xpEarned != null
                ? `Session enregistrée — +${xpEarned} XP éveil`
                : 'Session terminée'}
            </p>
            {logError && <p className="text-xs text-red-300">{logError}</p>}
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
        🧘 Pratique quotidiennement pour réduire ton stress au volant — validé par 30 ans
        de recherche en neurosciences du sommeil.
      </p>
    </div>
  )
}
