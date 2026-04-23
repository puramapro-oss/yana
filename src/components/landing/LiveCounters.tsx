'use client'

import { useEffect, useState } from 'react'
import { TreePine, Route, Users2 } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { useTranslations } from 'next-intl'

type PublicStats = {
  users: number
  trips: number
  trees_planted: number
  co2_offset_kg: number
  rewards_distributed_eur: number
}

const FALLBACK: PublicStats = {
  users: 0,
  trips: 0,
  trees_planted: 0,
  co2_offset_kg: 0,
  rewards_distributed_eur: 0,
}

export default function LiveCounters() {
  const t = useTranslations('home.counters')
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats/public', { cache: 'default' })
      .then((res) => (res.ok ? res.json() : FALLBACK))
      .then((data: PublicStats) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(FALLBACK)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const data = stats ?? FALLBACK
  const items = [
    {
      key: 'trips',
      label: t('trips'),
      value: data.trips,
      icon: Route,
      color: 'text-[var(--accent-primary)]',
    },
    {
      key: 'trees',
      label: t('trees'),
      value: data.trees_planted,
      icon: TreePine,
      color: 'text-[var(--green)]',
    },
    {
      key: 'users',
      label: t('users'),
      value: data.users,
      icon: Users2,
      color: 'text-[var(--accent-secondary)]',
    },
  ]

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.key}
            className="glass flex items-center gap-4 p-5 sm:flex-col sm:items-start sm:gap-3"
          >
            <Icon className={`h-7 w-7 ${item.color}`} aria-hidden strokeWidth={1.6} />
            <div className="flex flex-col">
              <AnimatedCounter
                value={item.value}
                className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl"
              />
              <span className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {item.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
