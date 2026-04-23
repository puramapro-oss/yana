import { Suspense } from 'react'
import Link from 'next/link'
import FinancerWizard from '@/components/financer/FinancerWizard'
import Skeleton from '@/components/ui/Skeleton'
import { APP_NAME } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: `Financer ma mobilité — ${APP_NAME}`,
  description:
    'En 3 questions, découvre combien d\'aides tu peux cumuler pour ta mobilité : bonus écologique, prime à la conversion, Forfait Mobilité Durable, aide permis, aides handicap, carburant et plus.',
}

export default function FinancerPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          {APP_NAME} · aides officielles
        </p>
        <h1 className="mt-3 gradient-text font-[family-name:var(--font-display)] text-3xl font-bold sm:text-5xl">
          Combien peux-tu toucher&nbsp;?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
          Bonus écologique, prime à la conversion, Forfait Mobilité Durable, aide permis, aides
          handicap&hellip; On t&apos;aide à identifier les dispositifs officiels cumulables selon ton profil et ta région.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <FinancerWizard />
      </Suspense>

      <footer className="mt-6 text-center text-xs text-[var(--text-muted)]">
        Les montants indiqués sont les plafonds officiels. Les conditions d&apos;éligibilité précises
        (revenus, ancienneté, justificatifs) sont détaillées sur chaque site officiel.{' '}
        <Link href="/signup" className="text-[var(--cyan)] hover:underline">
          NAMA-PILOTE peut t&apos;accompagner.
        </Link>
      </footer>
    </main>
  )
}
