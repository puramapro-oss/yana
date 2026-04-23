import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Désabonnement confirmé — YANA',
  description: 'Tu ne recevras plus d\'emails marketing YANA. Tes emails transactionnels (wallet, retrait) restent actifs.',
  robots: { index: false, follow: false },
}

export default function UnsubscribedPage() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-10 backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-3xl"
          >
            🛞
          </span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
          Désabonnement confirmé
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          Tu ne recevras plus d&apos;emails marketing YANA. Les emails{' '}
          <strong className="text-[var(--text-primary)]">transactionnels</strong> (retraits wallet,
          factures, confirmations) restent actifs — ils sont obligatoires.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          Tu peux te réabonner à tout moment depuis tes réglages.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.55)] transition hover:brightness-110"
          >
            Retour à YANA
          </Link>
          <Link
            href="/settings/notifications"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-black/10 px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
          >
            Gérer mes préférences
          </Link>
        </div>
      </div>
    </main>
  )
}
