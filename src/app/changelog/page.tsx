import { APP_NAME } from '@/lib/constants'

export const metadata = {
  title: `Changelog · ${APP_NAME}`,
  description: `Historique des évolutions ${APP_NAME}.`,
}

const ENTRIES = [
  {
    date: '2026-04-23',
    version: '0.1.0',
    title: 'Lancement',
    items: [
      'Mise en ligne de la plateforme web',
      'Authentification email + Google OAuth',
      'Chat NAMA-PILOTE (copilote IA sécurité routière + écoconduite)',
      '45 aides mobilité référencées dans /financer',
      '3 plans d’abonnement VITAE (Essentiel, Infini, Legende)',
      'Webhook Stripe idempotent + parrainage 50% premier paiement',
    ],
  },
] as const

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Changelog</p>
        <h1 className="mt-3 gradient-text font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
          Ce qui évolue sur {APP_NAME}
        </h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          Chaque ajout livré est documenté ici, plus un aperçu de la prochaine phase.
        </p>
      </header>

      <section aria-label="Versions" className="mt-10 space-y-8">
        {ENTRIES.map((e) => (
          <article key={e.version} className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
                {e.title}
              </h2>
              <time className="text-xs text-[var(--text-muted)]">
                v{e.version} · {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </time>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              {e.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent-primary)]" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-white/[0.01] p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Prochainement
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tracking temps réel des trajets (SAFE DRIVE score 0-100) · compensation CO₂ automatique
          avec plantation d&apos;arbres certifiée · covoiturage Dual Reward · mode Moto ·
          application mobile iOS & Android.
        </p>
      </section>
    </main>
  )
}
