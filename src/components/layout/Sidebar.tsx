'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Car, MessageSquare, Users, TreeDeciduous, LogOut, Play,
  ChevronLeft, ChevronRight, Shield, HelpCircle, Gift, Wallet, Trophy, Ticket,
  Award, Store, BookOpen, Wind, Heart, Target,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SUPER_ADMIN_EMAIL, APP_SHORT_NAME } from '@/lib/constants'
import ThemeToggle from './ThemeToggle'

type NavItem = { href: string; icon: typeof Home; label: string; testId: string }

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Accueil', testId: 'nav-accueil' },
  { href: '/drive', icon: Play, label: 'SAFE DRIVE', testId: 'nav-drive' },
  { href: '/green', icon: TreeDeciduous, label: 'GREEN DRIVE', testId: 'nav-green' },
  { href: '/carpool', icon: Users, label: 'Covoiturage', testId: 'nav-carpool' },
  { href: '/vehicles', icon: Car, label: 'Véhicules', testId: 'nav-vehicles' },
  { href: '/chat', icon: MessageSquare, label: 'NAMA-PILOTE', testId: 'nav-chat' },
  { href: '/referral', icon: Gift, label: 'Parrainage', testId: 'nav-referral' },
  { href: '/wallet', icon: Wallet, label: 'Portefeuille', testId: 'nav-wallet' },
  { href: '/contest', icon: Trophy, label: 'Classement', testId: 'nav-contest' },
  { href: '/lottery', icon: Ticket, label: 'Tirage', testId: 'nav-lottery' },
  { href: '/achievements', icon: Award, label: 'Achievements', testId: 'nav-achievements' },
  { href: '/boutique', icon: Store, label: 'Boutique', testId: 'nav-boutique' },
  { href: '/breathe', icon: Wind, label: 'Respire', testId: 'nav-breathe' },
  { href: '/gratitude', icon: Heart, label: 'Gratitude', testId: 'nav-gratitude' },
  { href: '/intention', icon: Target, label: 'Intention', testId: 'nav-intention' },
  { href: '/guide', icon: BookOpen, label: 'Guide', testId: 'nav-guide' },
  { href: '/aide', icon: HelpCircle, label: 'Aide', testId: 'nav-aide' },
]

// Les items suivants seront activés par phase :
//   /kyc (P2.3 flow, accessible directement par lien)
//   /missions · /settings · /profile · /concours (P3)
//   /admin · /ambassadeur (P3-P4)

const ADMIN_ITEM: NavItem = { href: '/admin', icon: Shield, label: 'Admin', testId: 'nav-admin' }

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const isSuperAdmin = profile?.email === SUPER_ADMIN_EMAIL || profile?.role === 'super_admin'
  const navItems = isSuperAdmin ? [...PRIMARY_NAV, ADMIN_ITEM] : PRIMARY_NAV

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-[var(--border)] bg-[var(--bg-nebula)]/80 backdrop-blur-xl transition-all duration-300 lg:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
      aria-label="Navigation principale"
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-[var(--border)] px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🛞
            </span>
            <span className="gradient-text font-[family-name:var(--font-display)] text-xl font-bold">
              {APP_SHORT_NAME}
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
          aria-label={collapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 scrollbar-thin">
        {navItems.map(({ href, icon: Icon, label, testId }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href + '/')) ||
            (href === '/dashboard' && pathname === '/dashboard')
          return (
            <Link
              key={href}
              href={href}
              data-testid={testId}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-white/10 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Thème
            </span>
            <ThemeToggle />
          </div>
        )}
        {collapsed && (
          <div className="mb-2 flex justify-center">
            <ThemeToggle compact />
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors',
            collapsed && 'justify-center px-0'
          )}
          data-testid="sidebar-signout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
        {!collapsed && profile && (
          <Link
            href="/settings"
            data-testid="sidebar-user-card"
            className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 p-2 transition hover:bg-white/10"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-xs font-bold text-white"
              aria-hidden
            >
              {getInitials(profile.full_name ?? profile.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                {profile.full_name ?? 'YANA'}
              </p>
              <p className="truncate text-[10px] text-[var(--text-muted)]">
                {profile.plan === 'free' ? 'Découverte' : profile.plan}
              </p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  )
}
