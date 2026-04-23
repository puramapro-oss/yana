'use client'

import Link from 'next/link'
import { Shield, Leaf, Users2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Hero3D from '@/components/landing/Hero3D'
import LiveCounters from '@/components/landing/LiveCounters'
import TravelQuote from '@/components/landing/TravelQuote'

// Écran accueil APP YANA — 3 blocs above-fold selon §15 CLAUDE.md.
// Bloc 1 : Hero3D + CTA · Bloc 2 : 3 pratiques (Safe/Green/Covoit) · Bloc 3 : contre-preuve live + citation
export default function HomePage() {
  const t = useTranslations('home')
  const year = new Date().getFullYear()

  const features = [
    {
      key: 'safe',
      icon: Shield,
      accent: 'text-[var(--accent-primary)]',
      ring: 'group-hover:border-[var(--accent-primary)]/40',
      glow: 'from-[var(--accent-primary)]/15',
    },
    {
      key: 'green',
      icon: Leaf,
      accent: 'text-[var(--green)]',
      ring: 'group-hover:border-[var(--green)]/35',
      glow: 'from-[var(--green)]/12',
    },
    {
      key: 'carpool',
      icon: Users2,
      accent: 'text-[var(--accent-secondary)]',
      ring: 'group-hover:border-[var(--accent-secondary)]/40',
      glow: 'from-[var(--accent-secondary)]/15',
    },
  ] as const

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* ============ BLOC 1 — HERO 3D + CTA (fold 1, 100vh min) ============ */}
      <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden">
        <Hero3D />

        <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden className="text-2xl">
              🛞
            </span>
            <span className="gradient-text font-[family-name:var(--font-display)]">
              {t('appName')}
            </span>
          </span>
          <Link
            href="/pricing"
            className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {t('footer.pricing')}
          </Link>
        </nav>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-[var(--text-muted)]">
            {t('brand')}
          </p>
          <h1 className="gradient-text font-[family-name:var(--font-display)] text-5xl font-bold leading-[0.95] sm:text-7xl">
            {t('appName')}
          </h1>
          <p className="mt-4 font-[family-name:var(--font-display)] text-xl text-[var(--text-secondary)] sm:text-2xl">
            {t('tagline')}
          </p>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            {t('pitch')}
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              data-testid="home-start"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_40px_-8px_rgba(249,115,22,0.55)] transition hover:brightness-110"
            >
              {t('cta.start')}
            </Link>
            <Link
              href="/login"
              data-testid="home-login"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-black/20 px-8 py-4 text-base font-semibold text-[var(--text-primary)] backdrop-blur-sm transition hover:bg-white/5"
            >
              {t('cta.login')}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="absolute bottom-6 flex h-10 w-6 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            aria-label="Découvrir"
          >
            <span
              aria-hidden
              className="inline-block h-2 w-0.5 animate-bounce bg-current"
              style={{ animationDuration: '1.4s' }}
            />
          </button>
        </div>
      </section>

      {/* ============ BLOC 2 — 3 PRATIQUES (Safe / Green / Carpool) ============ */}
      <section
        id="features"
        className="relative mx-auto w-full max-w-6xl px-6 py-20 sm:py-28"
      >
        <h2 className="mb-12 text-center font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
          {t('features.headline')}
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map(({ key, icon: Icon, accent, ring, glow }) => (
            <article
              key={key}
              className={`group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 backdrop-blur-xl transition-all duration-300 ${ring} hover:-translate-y-1`}
            >
              <div
                aria-hidden
                className={`absolute inset-0 -z-10 bg-gradient-to-br ${glow} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
              />
              <Icon className={`mb-5 h-10 w-10 ${accent}`} strokeWidth={1.4} aria-hidden />
              <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {t(`features.${key}.desc`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ============ BLOC 3 — PREUVE LIVE + CITATION VOYAGE ============ */}
      <section className="relative mx-auto w-full max-w-5xl px-6 pb-24">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          {t('counters.heading')}
        </p>
        <LiveCounters />
        <div className="mt-16">
          <TravelQuote />
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-6 pb-10 text-xs text-[var(--text-muted)] sm:flex-row sm:justify-between">
        <p>{t('footer.copyright', { year })}</p>
        <div className="flex gap-4">
          <Link href="/mentions-legales" className="hover:text-[var(--text-primary)]">
            {t('footer.legal')}
          </Link>
          <Link href="/politique-confidentialite" className="hover:text-[var(--text-primary)]">
            {t('footer.privacy')}
          </Link>
          <Link href="/cgu" className="hover:text-[var(--text-primary)]">
            {t('footer.cgu')}
          </Link>
        </div>
      </footer>
    </main>
  )
}
