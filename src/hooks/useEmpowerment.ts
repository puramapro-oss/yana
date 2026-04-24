'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Fréquences sacrées mappées par famille de routes.
 *  888 Hz = Or    → abondance, argent, récompenses       (wallet, referral, boutique, invoices, contest, lottery)
 *  963 Hz = Violet → éveil, achievements, spirituel       (achievements, breathe, gratitude, intention, spiritual)
 *  528 Hz = Vert  → cœur, dashboard, santé                (dashboard, green, drive, carpool, vehicles, kyc, profile)
 *  639 Hz = Rose  → relation, chat, communauté            (chat, notifications, admin, guide, settings)
 */
export type Frequency = 888 | 963 | 528 | 639

const ROUTE_FREQUENCY: Array<{ match: RegExp; freq: Frequency }> = [
  { match: /^\/(wallet|referral|boutique|invoices|contest|lottery)(\/|$)/, freq: 888 },
  { match: /^\/(achievements|breathe|gratitude|intention|spiritual)(\/|$)/, freq: 963 },
  { match: /^\/(chat|notifications|admin|guide|settings|aide)(\/|$)/, freq: 639 },
]

export function routeFrequency(pathname: string): Frequency {
  for (const { match, freq } of ROUTE_FREQUENCY) {
    if (match.test(pathname)) return freq
  }
  return 528
}

const FREQUENCY_COLOR: Record<Frequency, string> = {
  888: 'var(--gold)',
  963: 'var(--purple)',
  528: 'var(--green)',
  639: 'var(--pink)',
}

const FIB = { xs: 8, sm: 13, md: 21, lg: 34, xl: 55, xxl: 89 } as const

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }

export function useEmpowerment() {
  const t = useTranslations('common.poetic')
  const pathname = usePathname() ?? '/'

  const frequency = useMemo<Frequency>(() => routeFrequency(pathname), [pathname])

  const messages = useMemo(
    () => ({
      loading: t('loading'),
      error: t('error'),
      empty: t('empty'),
      welcome: t('welcome'),
      logout: t('logout'),
      congrats: t('congrats'),
      retry: t('retry'),
    }),
    [t],
  )

  return {
    messages,
    frequency,
    color: FREQUENCY_COLOR[frequency],
    fib: FIB,
    spring: SPRING,
  }
}
