'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Car } from 'lucide-react'
import { APP_NAME, PLANS } from '@/lib/constants'

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}

function ConfirmationContent() {
  const params = useSearchParams()
  const planId = params.get('plan') as keyof typeof PLANS | null
  const plan = planId ? PLANS[planId] : null
  const [confettiPlayed, setConfettiPlayed] = useState(false)

  useEffect(() => {
    if (!confettiPlayed) setConfettiPlayed(true)
  }, [confettiPlayed])

  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden />
      </div>

      <h1 className="mt-6 gradient-text font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
        Bienvenue dans {APP_NAME} 🛞
      </h1>
      {plan && (
        <p className="mt-2 text-[var(--text-secondary)]">
          Plan <strong className="text-[var(--text-primary)]">{plan.label}</strong> activé ·
          multiplicateur gains ×{plan.multiplier}
        </p>
      )}

      <p className="mt-6 text-[var(--text-secondary)]">
        Ton essai gratuit a démarré. Ta route commence maintenant — chaque trajet safe te
        rapproche d&apos;un monde plus serein, plus propre, plus riche.
      </p>

      <section
        aria-label="Prochaines étapes"
        className="mt-10 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6 text-left"
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Tes 3 prochaines étapes
        </h2>
        <ol className="mt-4 space-y-3 text-sm">
          <Step
            n={1}
            title="Ajoute ton véhicule"
            desc="Voiture ou moto — le type détermine ton score eco + plantation auto"
          />
          <Step
            n={2}
            title="Démarre ton premier trajet"
            desc="NAMA-PILOTE observe · score safety temps réel · Graines à l'arrivée"
          />
          <Step
            n={3}
            title="Active le covoiturage Dual Reward"
            desc="Conducteur ET passager gagnent — vérification d'identité requise avant 1er booking"
          />
        </ol>
      </section>

      <Link
        href="/dashboard"
        data-testid="confirmation-dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[var(--accent-primary)]/30 transition hover:brightness-110"
      >
        <Car className="h-4 w-4" /> Vers mon tableau de bord
      </Link>
    </main>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{desc}</p>
      </div>
    </li>
  )
}
