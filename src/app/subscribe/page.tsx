'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { PLANS, APP_NAME } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'

// /subscribe — L221-28 3° : waiver rétractation implicite par clic sur "Démarrer"
// Pas de checkbox : l'utilisateur accepte en cliquant le CTA (§21 + §35.5)
export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        </main>
      }
    >
      <SubscribeContent />
    </Suspense>
  )
}

function SubscribeContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const rawPlan = params.get('plan')
  const validPlans = ['essentiel', 'infini', 'legende'] as const
  const planId = (validPlans as readonly string[]).includes(rawPlan ?? '')
    ? (rawPlan as 'essentiel' | 'infini' | 'legende')
    : 'essentiel'
  const interval = (params.get('interval') as 'monthly' | 'yearly') ?? 'monthly'
  const plan = PLANS[planId]

  if (!plan) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Plan introuvable
        </h1>
        <Link href="/pricing" className="mt-4 inline-block text-[var(--accent-primary)] underline">
          Retour aux abonnements
        </Link>
      </main>
    )
  }

  async function startCheckout() {
    if (!user) {
      router.push(`/signup?next=/subscribe?plan=${planId}&interval=${interval}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      if (data.url) window.location.href = data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur Stripe')
    } finally {
      setLoading(false)
    }
  }

  const price = interval === 'monthly' ? plan.price_monthly : plan.price_yearly
  const priceEur = price / 100

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
      >
        ← Retour aux abonnements
      </Link>

      <h1 className="mt-6 gradient-text font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
        Démarrer {plan.label}
      </h1>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6">
        <dl className="space-y-3 text-sm">
          <Row label="Plan" value={plan.label} />
          <Row label="Facturation" value={interval === 'monthly' ? 'Mensuelle' : 'Annuelle (−33%)'} />
          <Row
            label="Prix"
            value={
              interval === 'monthly'
                ? `${formatPrice(priceEur)} / mois`
                : `${formatPrice(priceEur)} / an (soit ${formatPrice(priceEur / 12)} / mois)`
            }
          />
          <Row
            label="Essai gratuit"
            value={`${('trial_days' in plan ? plan.trial_days : 0)} jours · annulable à tout moment`}
          />
          <Row label="Multiplicateur gains" value={`×${plan.multiplier}`} />
        </dl>

        <button
          type="button"
          onClick={startCheckout}
          disabled={loading}
          data-testid="subscribe-start"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-primary)] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[var(--accent-primary)]/30 transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? 'Redirection Stripe…' : `Démarrer & recevoir ma prime`}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
          En cliquant sur « Démarrer », je demande expressément l&apos;exécution immédiate du
          service et je reconnais perdre mon droit de rétractation prévu à l&apos;article L.221-28
          3° du Code de la consommation dès le premier versement de prime (§21 {APP_NAME}). Je
          peux résilier à tout moment depuis mes paramètres · {' '}
          <Link href="/cgv" className="underline hover:text-[var(--text-primary)]">
            CGV
          </Link>{' '}
          · {' '}
          <Link href="/politique-confidentialite" className="underline hover:text-[var(--text-primary)]">
            Confidentialité
          </Link>
          .
        </p>
      </section>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--text-primary)]">{value}</dd>
    </div>
  )
}
