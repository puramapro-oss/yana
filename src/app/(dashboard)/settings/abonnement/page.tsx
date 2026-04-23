'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight, Check, CreditCard, ExternalLink, ReceiptText, Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { PLANS } from '@/lib/constants'
import { cn, formatDate, formatPrice } from '@/lib/utils'
import type { PlanId } from '@/lib/constants'

interface Payment {
  id: string
  amount_cents: number
  currency: string
  status: string
  created_at: string
  stripe_invoice_id: string | null
}

interface Invoice {
  id: string
  number: string
  amount_cents: number
  pdf_url: string | null
  issued_at: string
}

interface SubscriptionResponse {
  plan: PlanId
  hasStripeCustomer: boolean
  hasActiveSubscription: boolean
  payments: Payment[]
  invoices: Invoice[]
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  succeeded: { label: 'Payé', className: 'bg-emerald-500/10 text-emerald-300' },
  pending: { label: 'En attente', className: 'bg-yellow-500/10 text-yellow-300' },
  failed: { label: 'Échec', className: 'bg-red-500/10 text-red-300' },
  refunded: { label: 'Remboursé', className: 'bg-white/5 text-[var(--text-muted)]' },
}

export default function AbonnementPage() {
  const { loading: authLoading, user } = useAuth()
  const [data, setData] = useState<SubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      if (!res.ok) {
        setError('Impossible de charger ton abonnement. Réessaie.')
        setLoading(false)
        return
      }
      const body: SubscriptionResponse = await res.json()
      setData(body)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchStatus()
  }, [user, fetchStatus])

  async function openPortal() {
    setOpening(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const body = await res.json()
      if (!res.ok || !body.url) {
        setPortalError(body.error ?? 'Impossible d\'ouvrir le portail Stripe.')
        return
      }
      window.location.href = body.url
    } catch {
      setPortalError('Erreur réseau. Réessaie.')
    } finally {
      setOpening(false)
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message="Session expirée. Reconnecte-toi." />
      </div>
    )
  }

  const plan = data ? PLANS[data.plan] ?? PLANS.free : null
  const paidPlanIds: PlanId[] = ['essentiel', 'infini', 'legende']

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
      <header>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            data-testid="abonnement-back"
          >
            ← Réglages
          </Link>
        </div>
        <h1 className="mt-2 flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <CreditCard className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
          Abonnement
        </h1>
      </header>

      {loading ? (
        <>
          <Skeleton className="h-44" />
          <Skeleton className="h-48" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStatus} />
      ) : data && plan ? (
        <>
          <section className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--cyan)]/10 blur-3xl" />

            <div className="relative">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Plan actuel</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
                  {plan.label}
                </h2>
                {'popular' in plan && plan.popular && (
                  <span className="rounded-full bg-[var(--cyan)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--cyan)]">
                    ⭐ Populaire
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {plan.price_monthly === 0
                  ? 'Plan gratuit — Points uniquement, € verrouillés.'
                  : `${formatPrice(plan.price_monthly)}/mois · ${formatPrice(plan.price_yearly)}/an (-33%)`}
              </p>

              <ul className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {data.hasStripeCustomer ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={openPortal}
                    loading={opening}
                    icon={<ExternalLink size={16} />}
                    data-testid="abonnement-open-portal"
                  >
                    Gérer mon abonnement
                  </Button>
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    data-testid="abonnement-view-plans"
                  >
                    <Sparkles size={16} />
                    Voir les plans
                  </Link>
                )}

                {data.plan !== 'legende' && (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/5"
                    data-testid="abonnement-upgrade"
                  >
                    Upgrade
                    <ArrowUpRight size={16} />
                  </Link>
                )}
              </div>

              {portalError && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
                  {portalError}
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="other-plans-title" className="flex flex-col gap-3">
            <h2 id="other-plans-title" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Autres plans
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {paidPlanIds
                .filter((pid) => pid !== data.plan)
                .map((pid) => {
                  const p = PLANS[pid]
                  return (
                    <Link
                      key={pid}
                      href={`/pricing`}
                      data-testid={`other-plan-${pid}`}
                      className={cn(
                        'glass rounded-xl p-4 transition hover:border-[var(--border-glow)]',
                      )}
                    >
                      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                        {p.label}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        dès {formatPrice(p.price_monthly)}/mois
                      </p>
                    </Link>
                  )
                })}
            </div>
          </section>

          <section aria-labelledby="invoices-title" className="glass rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="invoices-title"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                <ReceiptText className="h-5 w-5 text-[var(--text-muted)]" />
                Factures récentes
              </h2>
              <Link
                href="/invoices"
                className="text-xs text-[var(--cyan)] hover:underline"
                data-testid="abonnement-all-invoices"
              >
                Toutes les factures
              </Link>
            </div>

            {data.invoices.length === 0 ? (
              <EmptyState
                icon={<ReceiptText size={24} />}
                title="Aucune facture"
                description="Tes factures apparaîtront ici après ton premier paiement."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {data.invoices.slice(0, 5).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{inv.number}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(inv.issued_at)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                      {formatPrice(inv.amount_cents)}
                    </span>
                    {inv.pdf_url && (
                      <a
                        href={inv.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--cyan)] hover:underline"
                      >
                        PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.payments.length > 0 && (
            <section aria-labelledby="payments-title" className="glass rounded-2xl p-5 sm:p-6">
              <h2
                id="payments-title"
                className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                Historique paiements
              </h2>
              <ul className="flex flex-col gap-2">
                {data.payments.slice(0, 8).map((p) => {
                  const status = PAYMENT_STATUS_LABELS[p.status] ?? {
                    label: p.status,
                    className: 'bg-white/5 text-[var(--text-muted)]',
                  }
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--text-primary)]">{formatDate(p.created_at)}</p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                        {formatPrice(p.amount_cents)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <p className="text-xs text-[var(--text-muted)]">
            Facturation SASU PURAMA · TVA non applicable (art. 293 B du CGI) · Paiement sécurisé Stripe.
          </p>
        </>
      ) : null}
    </div>
  )
}
