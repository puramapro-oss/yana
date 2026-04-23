import Link from 'next/link'
import {
  Users, Car, TreeDeciduous, Banknote, Ticket, Gauge, Coins, Sparkles,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface PoolRow {
  pool_type: string
  balance_cents: number
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function getStats() {
  const admin = createServiceClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersTotal,
    tripsTotal,
    carpoolsTotal,
    treesTotal,
    withdrawalsPending,
    ticketsOpen,
    pools,
    recentTrips,
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('trips').select('id', { count: 'exact', head: true }),
    admin.from('carpools').select('id', { count: 'exact', head: true }),
    admin.from('trees_planted').select('id', { count: 'exact', head: true }),
    admin
      .from('withdrawals')
      .select('amount_cents', { count: 'exact' })
      .eq('status', 'pending'),
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    admin.from('pool_balances').select('pool_type, balance_cents'),
    admin
      .from('trips')
      .select('user_id')
      .gte('started_at', sevenDaysAgo),
  ])

  const pendingSum = (withdrawalsPending.data ?? []).reduce(
    (acc: number, row: { amount_cents: number | null }) => acc + Number(row.amount_cents ?? 0),
    0,
  )
  const activeUsers = new Set((recentTrips.data ?? []).map((r: { user_id: string }) => r.user_id)).size

  const poolRows = (pools.data ?? []) as PoolRow[]
  const poolsMap: Record<string, number> = {}
  for (const row of poolRows) poolsMap[row.pool_type] = Number(row.balance_cents ?? 0)

  return {
    usersTotal: usersTotal.count ?? 0,
    usersActive7d: activeUsers,
    tripsTotal: tripsTotal.count ?? 0,
    carpoolsTotal: carpoolsTotal.count ?? 0,
    treesTotal: treesTotal.count ?? 0,
    withdrawalsPendingCount: withdrawalsPending.count ?? 0,
    withdrawalsPendingSum: pendingSum,
    ticketsOpen: ticketsOpen.count ?? 0,
    pools: {
      reward_users_cents: poolsMap['reward_users'] ?? 0,
      asso_purama_cents: poolsMap['asso_purama'] ?? 0,
      sasu_purama_cents: poolsMap['sasu_purama'] ?? 0,
      eco_trees_cents: poolsMap['eco_trees'] ?? 0,
    },
  }
}

export default async function AdminOverviewPage() {
  const s = await getStats()

  const kpis = [
    {
      label: 'Utilisateurs',
      value: s.usersTotal.toLocaleString('fr-FR'),
      sub: `${s.usersActive7d} actifs 7j`,
      icon: Users,
      color: 'from-[#F97316]/20 to-[#F97316]/5',
      testId: 'kpi-users',
    },
    {
      label: 'Trajets',
      value: s.tripsTotal.toLocaleString('fr-FR'),
      sub: `${s.carpoolsTotal} covoit.`,
      icon: Car,
      color: 'from-[#0EA5E9]/20 to-[#0EA5E9]/5',
      testId: 'kpi-trips',
    },
    {
      label: 'Arbres plantés',
      value: s.treesTotal.toLocaleString('fr-FR'),
      sub: 'certifiés OTS',
      icon: TreeDeciduous,
      color: 'from-green-500/20 to-green-500/5',
      testId: 'kpi-trees',
    },
    {
      label: 'Retraits pending',
      value: s.withdrawalsPendingCount.toString(),
      sub: `${formatEur(s.withdrawalsPendingSum)} €`,
      icon: Banknote,
      color: 'from-yellow-500/20 to-yellow-500/5',
      testId: 'kpi-withdrawals',
    },
    {
      label: 'Tickets ouverts',
      value: s.ticketsOpen.toString(),
      sub: 'SAV à traiter',
      icon: Ticket,
      color: 'from-rose-500/20 to-rose-500/5',
      testId: 'kpi-tickets',
    },
    {
      label: 'Pool Utilisateurs',
      value: `${formatEur(s.pools.reward_users_cents)} €`,
      sub: '50% CA',
      icon: Gauge,
      color: 'from-[#7C3AED]/20 to-[#7C3AED]/5',
      testId: 'kpi-pool-users',
    },
  ]

  const secondaryPools = [
    { label: 'Pool Association', value: s.pools.asso_purama_cents, icon: Sparkles },
    { label: 'Pool SASU', value: s.pools.sasu_purama_cents, icon: Coins },
    { label: 'Pool Éco-arbres', value: s.pools.eco_trees_cents, icon: TreeDeciduous },
  ]

  const quickLinks = [
    { href: '/admin/users', label: 'Gérer utilisateurs', testId: 'link-users' },
    { href: '/admin/withdrawals', label: 'Traiter retraits', testId: 'link-withdrawals' },
    { href: '/admin/tickets', label: 'Répondre SAV', testId: 'link-tickets' },
    { href: '/admin/contests', label: 'Classements / tirages', testId: 'link-contests' },
  ]

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Indicateurs temps réel
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div
                key={kpi.label}
                data-testid={kpi.testId}
                className={`rounded-2xl border border-[var(--border)] bg-gradient-to-br ${kpi.color} p-5`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {kpi.label}
                  </p>
                  <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{kpi.sub}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Trésorerie auxiliaire
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {secondaryPools.map((pool) => {
            const Icon = pool.icon
            return (
              <div key={pool.label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4">
                <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{pool.label}</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{formatEur(pool.value)} €</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={link.testId}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F97316] to-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
