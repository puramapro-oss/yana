'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Sparkles, Store } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import type { ItemsResponse, RedeemResult } from './types'
import ShopItemCard from './components/ShopItemCard'
import PurchaseHistory from './components/PurchaseHistory'
import RedeemSuccessModal from './components/RedeemSuccessModal'

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

  function handleCloseModal() {
    setRedeemResult(null)
    setCouponCopied(false)
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
              {data.items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  balance={data.balance}
                  isPending={redeemingSlug === item.slug}
                  onRedeem={redeem}
                />
              ))}
            </div>
          </section>

          {redeemError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{redeemError}</span>
            </div>
          )}

          <PurchaseHistory purchases={data.purchases} items={data.items} />

          {data.items.length === 0 && (
            <EmptyState
              icon={<Store size={32} />}
              title="Boutique vide"
              description="Les articles reviennent prochainement."
            />
          )}
        </>
      ) : null}

      <RedeemSuccessModal
        result={redeemResult}
        couponCopied={couponCopied}
        onClose={handleCloseModal}
        onCopyCoupon={copyCoupon}
      />
    </div>
  )
}
