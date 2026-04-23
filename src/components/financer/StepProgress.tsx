'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOTAL_STEPS } from '@/lib/aides-catalog'

interface StepProgressProps {
  current: 1 | 2 | 3 | 4
}

const STEP_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Profil',
  2: 'Situation',
  3: 'Région',
  4: 'Résultats',
}

export default function StepProgress({ current }: StepProgressProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label={`Étape ${current} sur ${TOTAL_STEPS}`}>
      {([1, 2, 3, 4] as const).map((step) => {
        const done = step < current
        const active = step === current
        return (
          <li key={step} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition',
                done && 'bg-[var(--cyan)]/20 text-[var(--cyan)]',
                active && 'bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] text-white',
                !done && !active && 'bg-white/5 text-[var(--text-muted)]',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="h-4 w-4" /> : step}
            </div>
            <span
              className={cn(
                'hidden text-xs uppercase tracking-wider sm:block',
                active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
              )}
            >
              {STEP_LABELS[step]}
            </span>
            {step < TOTAL_STEPS && (
              <div
                className={cn(
                  'h-px flex-1 transition',
                  done ? 'bg-[var(--cyan)]/40' : 'bg-white/10',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
