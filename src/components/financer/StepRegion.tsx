'use client'

import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { REGIONS, type RegionKey } from '@/lib/aides-catalog'

interface StepRegionProps {
  selected: RegionKey | null
  onSelect: (r: RegionKey) => void
  onNext: () => void
  onBack: () => void
}

export default function StepRegion({ selected, onSelect, onNext, onBack }: StepRegionProps) {
  return (
    <section aria-labelledby="step-region-title" className="flex flex-col gap-5">
      <header>
        <h2 id="step-region-title" className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Où vis-tu&nbsp;?
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Certaines aides sont régionales. Choisis ta région pour voir les dispositifs locaux cumulables.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {REGIONS.map((r) => {
          const active = selected === r.key
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => onSelect(r.key)}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition',
                active
                  ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/5 ring-1 ring-[var(--cyan)]/30'
                  : 'border-[var(--border)] bg-white/[0.02] hover:border-[var(--border-glow)] hover:bg-white/[0.04]',
              )}
              data-testid={`region-${r.key}`}
              aria-pressed={active}
            >
              <span className="font-medium text-[var(--text-primary)]">{r.label}</span>
              <span
                className={cn(
                  'h-3 w-3 shrink-0 rounded-full border-2 transition',
                  active ? 'border-[var(--cyan)] bg-[var(--cyan)]' : 'border-[var(--border)]',
                )}
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button variant="secondary" size="md" onClick={onBack} data-testid="step-region-back">
          ← Retour
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!selected}
          data-testid="step-region-next"
        >
          Voir mes aides →
        </Button>
      </div>
    </section>
  )
}
