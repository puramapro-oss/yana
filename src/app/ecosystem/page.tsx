import Link from 'next/link'
import { APP_NAME } from '@/lib/constants'

export const metadata = {
  title: `Écosystème PURAMA · ${APP_NAME}`,
  description: `${APP_NAME} appartient à l'écosystème wellness PURAMA : 20+ apps qui partagent les Graines, les niveaux Sanskrit et la même philosophie d'émancipation humaine.`,
}

const APPS = [
  { slug: 'kaia', name: 'KAÏA', domain: 'Santé & médecine intégrative', icon: '🌿' },
  { slug: 'prana', name: 'PRANA', domain: 'Respiration & pranayama', icon: '🌬️' },
  { slug: 'aether', name: 'AETHER', domain: 'Créativité & art-thérapie', icon: '🎨' },
  { slug: 'mana', name: 'MANA', domain: 'Finances conscientes', icon: '💰' },
  { slug: 'lumios', name: 'LUMIOS', domain: 'Sagesse & philosophie', icon: '✨' },
  { slug: 'vida', name: 'VIDA', domain: 'Santé quotidienne', icon: '❤️' },
  { slug: 'veda', name: 'VEDA', domain: 'Langues & cultures', icon: '📖' },
  { slug: 'akasha', name: 'AKASHA', domain: 'Expertise multi-domaine', icon: '🪐' },
  { slug: 'exodus', name: 'EXODUS', domain: 'Sortir du numérique', icon: '🚪' },
  { slug: 'sangha', name: 'SANGHA', domain: 'Communauté & entraide', icon: '🕊️' },
]

export default function EcosystemPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Écosystème</p>
        <h1 className="mt-3 gradient-text font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
          PURAMA — 20 apps, une même direction
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
          {APP_NAME} s&apos;inscrit dans un écosystème plus large. Tes Graines, tes niveaux
          Sanskrit, ton wallet et ton profil te suivent dans toutes les apps wellness PURAMA.
        </p>
      </header>

      <section
        aria-label="Apps de l'écosystème"
        className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {APPS.map((a) => (
          <article
            key={a.slug}
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4"
          >
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-3xl"
              aria-hidden
            >
              {a.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
                {a.name}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{a.domain}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-12 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
          Un compte. Toutes les apps.
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Ton email et ton mot de passe te donnent accès à toute la constellation PURAMA. Les
          Graines gagnées sur {APP_NAME} sont utilisables partout dans l&apos;écosystème.
        </p>
      </div>
    </main>
  )
}
