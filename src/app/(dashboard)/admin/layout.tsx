import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Banknote, Ticket, Trophy } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

const NAV = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard, testId: 'admin-nav-overview' },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users, testId: 'admin-nav-users' },
  { href: '/admin/withdrawals', label: 'Retraits', icon: Banknote, testId: 'admin-nav-withdrawals' },
  { href: '/admin/tickets', label: 'Tickets SAV', icon: Ticket, testId: 'admin-nav-tickets' },
  { href: '/admin/contests', label: 'Classements', icon: Trophy, testId: 'admin-nav-contests' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login?next=/admin')

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, email')
    .eq('id', auth.user.id)
    .maybeSingle()

  const isSuper =
    profile?.role === 'super_admin' ||
    (profile?.email ?? auth.user.email) === SUPER_ADMIN_EMAIL
  if (!isSuper) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <header className="border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
              Console super-admin
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Zone réservée · connecté en tant que {profile?.email ?? auth.user.email}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
          >
            ← Dashboard utilisateur
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Navigation admin">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.02] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[#F97316]/40 hover:text-[var(--text-primary)] transition-colors"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
