'use client'

import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { PROFILS, type ProfilKey } from '@/lib/aides-catalog'

interface StepProfilProps {
  selected: ProfilKey | null
  onSelect: (p: ProfilKey) => void
  onNext: () => void
}

export default function StepProfil({ selected, onSelect, onNext }: StepProfilProps) {
  return (
    <section aria-labelledby="step-profil-title" className="flex flex-col gap-5">
      <header>
        <h2 id="step-profil-title" className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Quelle est ta situation principale&nbsp;?
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Choisis le profil qui te correspond le mieux. Tu pourras ajouter des situations spécifiques à l&apos;étape suivante.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {PROFILS.map((p) => {
          const active = selected === p.key
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelect(p.key)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                active
                  ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/5 ring-1 ring-[var(--cyan)]/30'
                  : 'border-[var(--border)] bg-white/[0.02] hover:border-[var(--border-glow)] hover:bg-white/[0.04]',
              )}
              data-testid={`profil-${p.key}`}
              aria-pressed={active}
            >
              <span className="text-2xl" aria-hidden>
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text-primary)]">{p.label}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{p.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!selected}
          data-testid="step-profil-next"
        >
          Continuer →
        </Button>
      </div>
    </section>
  )
}
