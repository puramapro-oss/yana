'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle, Check, CheckCircle2, Copy, Gift, Percent, Sparkles,
  Store, Ticket, TrendingUp, Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { cn, formatDateTime } from '@/lib/utils'

interface ShopItem {
  id: string
  slug: string
  category: string
  name: string
  description: string
  cost_points: number
  item_type: string
  value_cents: number | null
  discount_percent: number | null
  duration_days: number | null
  target_plan: string | null
  sort_order: number
}

interface Purchase {
  id: string
  item_id: string
  points_spent: number
  coupon_code: string | null
  expires_at: string | null
  created_at: string
}

interface ItemsResponse {
  items: ShopItem[]
  balance: number
  purchases: Purchase[]
}

interface RedeemResult {
  itemName: string
  itemType: string
  couponCode: string | null
  balance: number
}

const ITEM_TYPE_ICON: Record<string, LucideIcon> = {
  discount_coupon: Percent,
  free_month: Gift,
  cash_credit: Wallet,
  referral_boost: TrendingUp,
  feature_unlock: Sparkles,
  ticket: Ticket,
}

export default function BoutiquePage() {
  const { loading: authLoading, user } = useAuth()
  const [data, setData] = useState<ItemsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [redeemingSlug, setRedeemingSlug] = useState<string | null>(null)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null)
  const [couponCopied, setCouponCopied] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/boutique/items', { cache: 'no-store' })
      if (!res.ok) {
        setError('Impossible de charger la boutique. Réessaie.')
        setLoading(false)
        return
      }
      const body: ItemsResponse = await res.json()
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

  async function redeem(slug: string) {
    setRedeemingSlug(slug)
    setRedeemError(null)
    setRedeemResult(null)
    try {
      const res = await fetch('/api/boutique/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const body = await res.json()
      if (!res.ok) {
        setRedeemError(body.error ?? 'Échange impossible.')
        setRedeemingSlug(null)
        return
      }
      setRedeemResult({
        itemName: body.itemName,
        itemType: body.itemType,
        couponCode: body.couponCode ?? null,
        balance: body.balance,
      })
      // Refetch pour MAJ balance + purchases
      fetchData()
    } catch {
      setRedeemError('Erreur réseau. Réessaie.')
    } finally {
      setRedeemingSlug(null)
    }
  }

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCouponCopied(true)
      setTimeout(() => setCouponCopied(false), 2000)
    } catch {
      // fallback silencieux
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState message="Session expirée. Reconnecte-toi." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <Store className="h-8 w-8 text-[var(--purple)] sm:h-10 sm:w-10" />
          Boutique Points
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Échange tes points PURAMA contre des réductions, mois offerts ou cash crédité au wallet.
        </p>
      </header>

      {loading ? (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-72" />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : data ? (
        <>
          <section className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--purple)]/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Solde points</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">
                  <AnimatedCounter value={data.balance} />
                </p>
              </div>
              <Sparkles className="h-12 w-12 text-[var(--purple)]/60" aria-hidden />
            </div>
            <p className="relative mt-3 text-xs text-[var(--text-muted)]">
              1 000 pts = −10% · 10 000 pts = 1 mois Essentiel · 50 000 pts = 5 € wallet
            </p>
          </section>

          <section aria-labelledby="catalog-title">
            <h2 id="catalog-title" className="sr-only">Catalogue</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.items.map((item) => {
                const Icon = ITEM_TYPE_ICON[item.item_type] ?? Gift
                const canAfford = data.balance >= item.cost_points
                const pct = Math.min(100, Math.round((data.balance / item.cost_points) * 100))
                const isPending = redeemingSlug === item.slug

                return (
                  <article
                    key={item.id}
                    className="glass flex flex-col gap-3 rounded-2xl p-5 sm:p-6"
                    data-testid={`shop-item-${item.slug}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
                          canAfford
                            ? 'bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--purple)]/20 text-[var(--cyan)]'
                            : 'bg-white/5 text-[var(--text-muted)]',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{item.name}</h3>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.description}</p>
                      </div>
                    </div>

                    {!canAfford && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          <span>Progression</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
                        {item.cost_points.toLocaleString('fr-FR')}
                        <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">pts</span>
                      </p>
                      <Button
                        variant={canAfford ? 'primary' : 'secondary'}
                        size="sm"
                        loading={isPending}
                        disabled={!canAfford || isPending}
                        onClick={() => redeem(item.slug)}
                        data-testid={`redeem-${item.slug}`}
                      >
                        {canAfford ? 'Échanger' : 'Verrouillé'}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          {redeemError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{redeemError}</span>
            </div>
          )}

          {data.purchases.length > 0 && (
            <section aria-labelledby="history-title" className="glass rounded-2xl p-5 sm:p-6">
              <h2 id="history-title" className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
                Historique
              </h2>
              <ul className="flex flex-col gap-2">
                {data.purchases.slice(0, 10).map((p) => {
                  const item = data.items.find((i) => i.id === p.item_id)
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[var(--text-primary)]">{item?.name ?? 'Article'}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDateTime(p.created_at)}
                          {p.coupon_code && ` · code ${p.coupon_code}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[var(--text-primary)]">
                        −{p.points_spent.toLocaleString('fr-FR')} pts
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {data.items.length === 0 && (
            <EmptyState
              icon={<Store size={32} />}
              title="Boutique vide"
              description="Les articles reviennent prochainement."
            />
          )}
        </>
      ) : null}

      <Modal
        open={redeemResult !== null}
        onClose={() => {
          setRedeemResult(null)
          setCouponCopied(false)
        }}
        title="Échange réussi"
      >
        {redeemResult && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                {redeemResult.itemName}
              </p>
            </div>

            {redeemResult.couponCode && (
              <div className="rounded-xl border border-[var(--cyan)]/30 bg-[var(--cyan)]/5 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Ton code</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-widest text-[var(--cyan)]">
                  {redeemResult.couponCode}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyCoupon(redeemResult.couponCode as string)}
                  icon={couponCopied ? <Check size={14} /> : <Copy size={14} />}
                  className="mt-3"
                >
                  {couponCopied ? 'Copié' : 'Copier le code'}
                </Button>
              </div>
            )}

            <p className="text-center text-sm text-[var(--text-secondary)]">
              Nouveau solde :{' '}
              <strong className="text-[var(--text-primary)]">
                {redeemResult.balance.toLocaleString('fr-FR')} pts
              </strong>
            </p>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setRedeemResult(null)
                setCouponCopied(false)
              }}
            >
              Fermer
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
