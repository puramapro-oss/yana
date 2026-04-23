'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, ReceiptText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { formatDate, formatPrice } from '@/lib/utils'

interface Invoice {
  id: string
  number: string
  stripe_invoice_id: string | null
  amount_cents: number
  currency: string
  pdf_url: string | null
  issued_at: string
}

interface InvoicesResponse {
  invoices: Invoice[]
  count: number
  totalYearCents: number
  totalLifetimeCents: number
  currentYear: number
}

export default function InvoicesPage() {
  const { loading: authLoading, user } = useAuth()
  const [data, setData] = useState<InvoicesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices?limit=100', { cache: 'no-store' })
      if (!res.ok) {
        setError('Impossible de charger tes factures. Réessaie.')
        setLoading(false)
        return
      }
      const body: InvoicesResponse = await res.json()
      setData(body)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchData()
  }, [user, fetchData])

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorState message="Session expirée. Reconnecte-toi." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 sm:gap-6">
      <header>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            data-testid="invoices-back"
          >
            ← Réglages
          </Link>
        </div>
        <h1 className="mt-2 flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <ReceiptText className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
          Factures
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Toutes tes factures SASU PURAMA (TVA non applicable, art. 293 B du CGI).
        </p>
      </header>

      {loading ? (
        <>
          <Skeleton className="h-24" />
          <Skeleton className="h-80" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : data ? (
        <>
          <section className="glass grid grid-cols-2 gap-4 rounded-2xl p-5 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Année {data.currentYear}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                <AnimatedCounter value={data.totalYearCents / 100} decimals={2} suffix=" €" />
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Total à vie
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                <AnimatedCounter value={data.totalLifetimeCents / 100} decimals={2} suffix=" €" />
              </p>
            </div>
          </section>

          <section className="glass rounded-2xl p-5 sm:p-6">
            {data.invoices.length === 0 ? (
              <EmptyState
                icon={<ReceiptText size={32} />}
                title="Aucune facture pour l'instant"
                description="Tes factures apparaîtront ici dès ton premier paiement d'abonnement."
              />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {data.invoices.length} facture{data.invoices.length > 1 ? 's' : ''}
                  </h2>
                </div>
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {data.invoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center gap-3 py-3"
                      data-testid={`invoice-${inv.id}`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--text-secondary)]">
                        <ReceiptText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {inv.number}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(inv.issued_at)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                        {formatPrice(inv.amount_cents)}
                      </span>
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-1.5 text-xs text-[var(--cyan)] hover:bg-white/5"
                          aria-label={`Télécharger PDF de la facture ${inv.number}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">PDF en attente</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <footer className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-xs text-[var(--text-secondary)]">
            <p>
              <strong className="text-[var(--text-primary)]">SASU PURAMA</strong> · 8 Rue de la Chapelle, 25560 Frasne, France
            </p>
            <p className="mt-1">
              TVA non applicable — article 293 B du CGI. Paiement sécurisé Stripe. Conservation des factures par tes soins.
            </p>
          </footer>
        </>
      ) : null}
    </div>
  )
}
