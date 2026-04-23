'use client'

import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'

// Écran accueil APP — pas landing 13 sections.
// Conforme §1 CLAUDE.md INTERDICTIONS : logo + "Commencer" + "Se connecter" (comme ChatGPT).
export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between px-6 py-12 sm:py-20">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(249,115,22,0.15), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 80%, rgba(14,165,233,0.12), transparent 60%)',
          }}
        />
      </div>

      <nav className="flex w-full max-w-5xl items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden className="text-2xl">
            🛞
          </span>
          <span className="gradient-text font-[family-name:var(--font-display)]">{APP_NAME}</span>
        </span>
        <Link
          href="/pricing"
          className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Abonnements
        </Link>
      </nav>

      <section className="flex w-full max-w-xl flex-col items-center text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          PURAMA · Mobility Wellness
        </p>
        <h1 className="gradient-text font-[family-name:var(--font-display)] text-5xl font-bold leading-tight sm:text-6xl">
          {APP_NAME}
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">{APP_TAGLINE}</p>
        <p className="mt-6 max-w-md text-base text-[var(--text-secondary)]">
          Conduis en sécurité. Dépollue. Gagne. Chaque trajet devient une méditation en mouvement
          — et récompense réelle.
        </p>

        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            data-testid="home-start"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[var(--accent-primary)]/30 transition hover:brightness-110"
          >
            Commencer
          </Link>
          <Link
            href="/login"
            data-testid="home-login"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
          >
            Se connecter
          </Link>
        </div>
      </section>

      <footer className="mt-16 flex w-full max-w-5xl flex-col items-center gap-2 text-xs text-[var(--text-muted)] sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} SASU PURAMA · TVA non applicable, art. 293 B du CGI</p>
        <div className="flex gap-4">
          <Link href="/mentions-legales" className="hover:text-[var(--text-primary)]">
            Mentions légales
          </Link>
          <Link href="/politique-confidentialite" className="hover:text-[var(--text-primary)]">
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-[var(--text-primary)]">
            CGU
          </Link>
        </div>
      </footer>
    </main>
  )
}
