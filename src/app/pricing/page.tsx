'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { PLANS, APP_NAME } from '@/lib/constants'
import { cn, formatPrice } from '@/lib/utils'

type Interval = 'monthly' | 'yearly'

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly')

  const paidPlans = [PLANS.essentiel, PLANS.infini, PLANS.legende]

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          PURAMA · Mobility Wellness
        </p>
        <h1 className="gradient-text mt-3 font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
          Un abonnement, toute la route.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[var(--text-secondary)]">
          Conduis safe, covoiture, plante des arbres — {APP_NAME} récompense ta route. Essai 14
          jours sur tous les plans payants.
        </p>

        <div className="mt-8 inline-flex items-center rounded-full border border-[var(--border)] bg-white/[0.02] p-1">
          <button
            type="button"
            data-testid="pricing-interval-monthly"
            onClick={() => setInterval('monthly')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition',
              interval === 'monthly'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            data-testid="pricing-interval-yearly"
            onClick={() => setInterval('yearly')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition',
              interval === 'yearly'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            Annuel <span className="ml-1 text-[10px] font-bold text-emerald-400">−33%</span>
          </button>
        </div>
      </header>

      <section aria-label="Plans" className="mt-12 grid gap-5 lg:grid-cols-4">
        <PlanCard
          label={PLANS.free.label}
          priceMonthly={0}
          priceYearly={0}
          interval={interval}
          features={PLANS.free.features as unknown as string[]}
          ctaHref="/signup"
          ctaLabel="Créer un compte"
        />
        {paidPlans.map((p) => (
          <PlanCard
            key={p.id}
            label={p.label}
            priceMonthly={p.price_monthly}
            priceYearly={p.price_yearly}
            interval={interval}
            features={p.features as unknown as string[]}
            highlighted={'popular' in p && p.popular === true}
            ctaHref={`/subscribe?plan=${p.id}&interval=${interval}`}
            ctaLabel={'popular' in p && p.popular === true ? 'Commencer' : 'Choisir'}
            multiplier={p.multiplier}
            trialDays={p.trial_days}
          />
        ))}
      </section>

      <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <p className="text-sm font-medium text-emerald-300 sm:text-base">
          💚 <strong>Combien peux-tu toucher&nbsp;?</strong>{' '}
          <span className="text-emerald-200/90">
            En 3 questions, on identifie les aides mobilité cumulables pour ta situation :
            bonus écologique, prime carburant, FMD, aide permis, aides handicap, régionales&hellip;
          </span>
        </p>
        <Link
          href="/financer"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          data-testid="pricing-financer-cta"
        >
          Lancer le simulateur
          <span aria-hidden className="ml-1">→</span>
        </Link>
      </div>
    </main>
  )
}

function PlanCard(props: {
  label: string
  priceMonthly: number
  priceYearly: number
  interval: Interval
  features: string[]
  ctaHref: string
  ctaLabel: string
  highlighted?: boolean
  multiplier?: number
  trialDays?: number
}) {
  const price = props.interval === 'monthly' ? props.priceMonthly : props.priceYearly
  const yearlyMonthlyEquiv = props.priceYearly > 0 ? props.priceYearly / 12 : 0

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border bg-white/[0.02] p-6',
        props.highlighted
          ? 'border-[var(--accent-primary)] shadow-xl shadow-[var(--accent-primary)]/20'
          : 'border-[var(--border)]',
      )}
    >
      {props.highlighted && (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[var(--accent-primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          ⭐ Recommandé
        </span>
      )}
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
        {props.label}
      </h3>
      {props.multiplier && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Multiplicateur gains ×{props.multiplier}
        </p>
      )}
      <div className="mt-4">
        {price === 0 ? (
          <p className="text-3xl font-bold text-[var(--text-primary)]">Gratuit</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {formatPrice(
                props.interval === 'monthly' ? price / 100 : yearlyMonthlyEquiv / 100,
              )}
              <span className="text-base font-normal text-[var(--text-muted)]">/mois</span>
            </p>
            {props.interval === 'yearly' && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Soit {formatPrice(price / 100)} /an facturé en une fois
              </p>
            )}
            {props.trialDays && (
              <p className="mt-1 text-xs text-emerald-300">🎁 {props.trialDays} jours gratuits</p>
            )}
          </>
        )}
      </div>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--text-secondary)]">
        {props.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={props.ctaHref}
        className={cn(
          'mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition',
          props.highlighted
            ? 'bg-[var(--accent-primary)] text-white hover:brightness-110'
            : 'border border-[var(--border)] text-[var(--text-primary)] hover:bg-white/5',
        )}
      >
        {props.ctaLabel}
      </Link>
    </article>
  )
}
