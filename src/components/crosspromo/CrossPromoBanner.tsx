'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Check, Copy, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface PromoApp {
  slug: string
  name: string
  tagline: string
  description: string
  emoji: string
  color: string
  url: string
  couponCode: string
  discountLabel: string
  alreadyClicked: boolean
}

export default function CrossPromoBanner() {
  const { user } = useAuth()
  const [apps, setApps] = useState<PromoApp[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimingSlug, setClaimingSlug] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const fetchPromos = useCallback(async () => {
    try {
      const res = await fetch('/api/cross-promo', { cache: 'no-store' })
      if (!res.ok) {
        setApps([])
        return
      }
      const body = await res.json()
      setApps(body.apps ?? [])
    } catch {
      setApps([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchPromos()
  }, [user, fetchPromos])

  async function claim(slug: string) {
    setClaimingSlug(slug)
    try {
      const res = await fetch('/api/cross-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetApp: slug }),
      })
      const body = await res.json()
      if (!res.ok) {
        setClaimingSlug(null)
        return
      }
      try {
        await navigator.clipboard.writeText(body.couponCode)
        setCopiedSlug(slug)
        setTimeout(() => setCopiedSlug(null), 2500)
      } catch {
        // clipboard bloqué — ouvre le lien quand même
      }
      // Ouvre dans un nouvel onglet avec le code en query param pour pré-fill
      const target = `${body.url}?ref=yana&code=${encodeURIComponent(body.couponCode)}`
      window.open(target, '_blank', 'noopener,noreferrer')
    } finally {
      setClaimingSlug(null)
    }
  }

  if (!user || loading || !apps || apps.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="crosspromo-title"
      className="flex flex-col gap-3"
      data-testid="cross-promo"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="crosspromo-title"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--cyan)]" />
          Écosystème Purama
        </h2>
        <a
          href="https://purama.dev/ecosystem"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--cyan)] hover:underline"
        >
          Voir tout
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {apps.map((app) => {
          const isClaiming = claimingSlug === app.slug
          const copied = copiedSlug === app.slug
          return (
            <article
              key={app.slug}
              className="glass relative overflow-hidden rounded-2xl p-4"
              data-testid={`crosspromo-${app.slug}`}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl"
                style={{ background: app.color }}
                aria-hidden
              />
              <div className="relative flex items-start gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                  style={{ background: `${app.color}20`, color: app.color }}
                  aria-hidden
                >
                  {app.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
                    {app.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{app.tagline}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  {app.discountLabel}
                </span>
              </div>

              <p className="relative mt-3 text-xs text-[var(--text-secondary)]">{app.description}</p>

              <button
                type="button"
                onClick={() => claim(app.slug)}
                disabled={isClaiming}
                className="relative mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/10 disabled:opacity-60"
                data-testid={`crosspromo-claim-${app.slug}`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-300" />
                    Code {app.couponCode} copié
                  </>
                ) : isClaiming ? (
                  'Préparation…'
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Récupérer le code
                    <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
