'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { SITUATIONS, type SituationKey } from '@/lib/aides-catalog'

interface StepSituationProps {
  selected: SituationKey[]
  onToggle: (s: SituationKey) => void
  onNext: () => void
  onBack: () => void
}

export default function StepSituation({ selected, onToggle, onNext, onBack }: StepSituationProps) {
  const selectedSet = new Set(selected)

  return (
    <section aria-labelledby="step-situation-title" className="flex flex-col gap-5">
      <header>
        <h2 id="step-situation-title" className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Qu&apos;est-ce qui te concerne&nbsp;?
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Coche toutes les situations qui s&apos;appliquent à toi. Plus tu en sélectionnes, plus nos suggestions sont précises.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {SITUATIONS.map((s) => {
          const active = selectedSet.has(s.key)
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onToggle(s.key)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3.5 text-left transition',
                active
                  ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/5 ring-1 ring-[var(--cyan)]/30'
                  : 'border-[var(--border)] bg-white/[0.02] hover:border-[var(--border-glow)] hover:bg-white/[0.04]',
              )}
              data-testid={`situation-${s.key}`}
              aria-pressed={active}
            >
              <span className="text-xl" aria-hidden>
                {s.emoji}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-[var(--text-primary)]">
                {s.label}
              </span>
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                  active
                    ? 'border-[var(--cyan)] bg-[var(--cyan)] text-[var(--bg-nebula)]'
                    : 'border-[var(--border)] bg-transparent',
                )}
                aria-hidden
              >
                {active && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button variant="secondary" size="md" onClick={onBack} data-testid="step-situation-back">
          ← Retour
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          data-testid="step-situation-next"
        >
          {selected.length > 0
            ? `Continuer (${selected.length} sélection${selected.length > 1 ? 's' : ''}) →`
            : 'Passer cette étape →'}
        </Button>
      </div>
    </section>
  )
}
