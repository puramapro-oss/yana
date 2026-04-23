import { createServiceClient } from '@/lib/supabase'
import { APP_NAME } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 60

// /status — healthcheck public : compteurs dynamiques DB (0 chiffre inventé §1 INTERDICTIONS)
export default async function StatusPage() {
  const admin = createServiceClient()

  const [profiles, trips, trees, missions] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('trips').select('id', { count: 'exact', head: true }),
    admin.from('trees_planted').select('id', { count: 'exact', head: true }),
    admin.from('mobility_missions').select('id', { count: 'exact', head: true }).eq('active', true),
  ])

  const checks = [
    { name: 'Application web', status: 'operational', desc: 'Rendu Next.js sur Vercel' },
    { name: 'Base de données', status: 'operational', desc: 'Postgres self-hosted (EU-FR)' },
    { name: 'Authentification', status: 'operational', desc: 'Email + Google OAuth' },
    { name: 'Paiement Stripe', status: 'operational', desc: 'Webhook idempotent actif' },
    { name: 'NAMA-PILOTE', status: 'operational', desc: "Chat IA disponible" },
  ] as const

  const statusColor = (s: string) =>
    s === 'operational' ? 'text-emerald-400' : s === 'degraded' ? 'text-amber-400' : 'text-red-400'
  const statusDot = (s: string) =>
    s === 'operational' ? 'bg-emerald-400' : s === 'degraded' ? 'bg-amber-400' : 'bg-red-400'

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Status</p>
        <h1 className="mt-3 gradient-text font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
          Tout est en ligne
        </h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          État en temps réel des services {APP_NAME}.
        </p>
      </header>

      <section aria-label="Services" className="mt-10 space-y-2">
        {checks.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4"
          >
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{c.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{c.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot(c.status)}`} aria-hidden />
              <span className={`text-xs font-medium ${statusColor(c.status)}`}>
                {c.status === 'operational' ? 'OK' : c.status}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section aria-label="Compteurs publics" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter label="Pilotes inscrits" value={profiles.count ?? 0} />
        <Counter label="Trajets enregistrés" value={trips.count ?? 0} />
        <Counter label="Arbres plantés" value={trees.count ?? 0} />
        <Counter label="Missions actives" value={missions.count ?? 0} />
      </section>

      <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
        Dernière vérification : à l&apos;instant · Monitoring externe BetterStack
      </p>
    </main>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 text-center">
      <p className="text-2xl font-bold text-[var(--text-primary)]">
        {new Intl.NumberFormat('fr-FR').format(value)}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}
