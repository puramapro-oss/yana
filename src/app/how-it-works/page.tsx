import Link from 'next/link'
import { Car, TreeDeciduous, Users, MessageSquare, Trophy, Wallet } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'

export const metadata = {
  title: `Comment ça marche · ${APP_NAME}`,
  description: `${APP_NAME} récompense la conduite sûre et la mobilité consciente. 6 étapes simples pour démarrer.`,
}

const STEPS = [
  {
    icon: Car,
    title: 'Tu conduis normalement',
    desc: "Ouvre l'app, démarre un trajet — YANA utilise GPS + accéléromètre + gyroscope pour scorer ta conduite (0-100).",
  },
  {
    icon: TreeDeciduous,
    title: 'YANA compense ton CO₂',
    desc: "À chaque tranche de 10 kg de CO₂ compensés (covoiturage, off-peak, éco-conduite), on plante un vrai arbre via Tree-Nation.",
  },
  {
    icon: Users,
    title: 'Tu partages (ou pas)',
    desc: "Dual Reward unique : covoitureur ET passager gagnent des Graines + des euros. Commission YANA 15% (vs 30% BlaBlaCar).",
  },
  {
    icon: MessageSquare,
    title: 'NAMA-PILOTE t’accompagne',
    desc: "Ton copilote IA : écoconduite, sécurité, fatigue (HRV), sagesse du voyage. 3 lignes rouges vitales pour protéger ta vie.",
  },
  {
    icon: Trophy,
    title: 'Tu gagnes des Graines 🌱',
    desc: "Missions quotidiennes, tirages mensuels KARMA, streaks, achievements. 1 Graine = 0,01 € utilisable dans la Marketplace.",
  },
  {
    icon: Wallet,
    title: 'Tu retires dès 5 €',
    desc: "Ton wallet se remplit par parrainage et commissions. Retrait IBAN direct au-delà de 5 €. Premier retrait 30 j après abonnement (art. L.221-28).",
  },
]

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          PURAMA · Mobility Wellness
        </p>
        <h1 className="mt-3 gradient-text font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
          Comment {APP_NAME} récompense ta route
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
          Pas de GPS chelou, pas de contrat d&apos;assurance, pas d&apos;app covoit standard. Juste
          un système transparent qui transforme chaque km en progrès mesurable.
        </p>
      </header>

      <ol className="mt-12 space-y-5">
        {STEPS.map((s, i) => (
          <li
            key={i}
            className="flex gap-5 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5"
          >
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <s.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Étape {i + 1}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
                {s.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
          Prêt·e à prendre la route autrement ?
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/5"
          >
            Voir les abonnements
          </Link>
        </div>
      </div>
    </main>
  )
}
