'use client'

import Link from 'next/link'
import {
  Bell, ChevronRight, CreditCard, LifeBuoy, LogOut, ReceiptText, Settings as SettingsIcon,
  Shield, UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import { APP_NAME } from '@/lib/constants'

interface Row {
  href?: string
  icon: LucideIcon
  label: string
  description: string
  testId: string
  danger?: boolean
  onClick?: () => void
}

export default function SettingsPage() {
  const { loading: authLoading, user, profile, signOut } = useAuth()

  const sections: Array<{ title: string; rows: Row[] }> = [
    {
      title: 'Compte',
      rows: [
        {
          href: '/profile',
          icon: UserRound,
          label: 'Profil',
          description: 'Nom, date de naissance, thème, langue',
          testId: 'settings-profile',
        },
        {
          href: '/settings/abonnement',
          icon: CreditCard,
          label: 'Abonnement',
          description: 'Plan actuel, facturation, paiement',
          testId: 'settings-subscription',
        },
        {
          href: '/invoices',
          icon: ReceiptText,
          label: 'Factures',
          description: 'Téléchargement des factures SASU (art. 293 B CGI)',
          testId: 'settings-invoices',
        },
      ],
    },
    {
      title: 'Préférences',
      rows: [
        {
          href: '/notifications',
          icon: Bell,
          label: 'Notifications',
          description: 'Centre de notifications in-app',
          testId: 'settings-notifications',
        },
        {
          href: '/settings/notifications',
          icon: Bell,
          label: 'Notifications push',
          description: 'Activer les push navigateur, fréquence, horaire',
          testId: 'settings-push',
        },
      ],
    },
    {
      title: 'Aide & légal',
      rows: [
        {
          href: '/aide',
          icon: LifeBuoy,
          label: 'Aide',
          description: 'FAQ, assistance, contact',
          testId: 'settings-help',
        },
        {
          href: '/politique-confidentialite',
          icon: Shield,
          label: 'Confidentialité',
          description: 'RGPD, DPO, données personnelles',
          testId: 'settings-privacy',
        },
      ],
    },
  ]

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message="Session expirée. Reconnecte-toi." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <SettingsIcon className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
          Réglages
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gère ton compte {APP_NAME}, tes préférences et ton abonnement.
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title} aria-labelledby={`section-${section.title}`} className="flex flex-col gap-2">
          <h2
            id={`section-${section.title}`}
            className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {section.title}
          </h2>
          <div className="glass flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-2xl">
            {section.rows.map((row) => {
              const Icon = row.icon
              const inner = (
                <div className="flex items-center gap-3 p-4 transition hover:bg-white/[0.02]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--text-secondary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{row.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
                </div>
              )
              return row.href ? (
                <Link key={row.label} href={row.href} data-testid={row.testId} className="block">
                  {inner}
                </Link>
              ) : (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.onClick}
                  data-testid={row.testId}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{profile?.full_name ?? user.email}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Connecté en tant que {user.email}
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={signOut}
            icon={<LogOut size={16} />}
            data-testid="settings-signout"
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  )
}
