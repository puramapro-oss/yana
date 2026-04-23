'use client'

import { useCallback, useEffect, useState } from 'react'
import { Cake, CheckCircle2, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface TodayEvent {
  type: 'birthday' | 'signup_anniversary'
  title: string
  message: string
  yearsCount: number
}

export default function AnniversaryBanner() {
  const { user } = useAuth()
  const [events, setEvents] = useState<TodayEvent[] | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [claimedTypes, setClaimedTypes] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/user-events/today', { cache: 'no-store' })
      if (!res.ok) return
      const body = await res.json()
      setEvents(body.events ?? [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (user) fetchEvents()
  }, [user, fetchEvents])

  async function claim(type: TodayEvent['type']) {
    setClaiming(type)
    setError(null)
    try {
      const res = await fetch('/api/user-events/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Réclamation impossible.')
        if (res.status === 409) {
          setClaimedTypes((prev) => new Set(prev).add(type))
        }
        return
      }
      setClaimedTypes((prev) => new Set(prev).add(type))
    } catch {
      setError('Erreur réseau.')
    } finally {
      setClaiming(null)
    }
  }

  if (!user || !events || events.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => {
        const isBirthday = event.type === 'birthday'
        const Icon = isBirthday ? Cake : Sparkles
        const gradient = isBirthday
          ? 'from-pink-500/15 via-purple-500/10 to-amber-500/10'
          : 'from-[var(--cyan)]/10 via-[var(--purple)]/10 to-pink-500/10'
        const claimed = claimedTypes.has(event.type)

        return (
          <div
            key={event.type}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-white/10 p-5 bg-gradient-to-br',
              gradient,
            )}
            data-testid={`anniversary-${event.type}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
                    {event.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{event.message}</p>
                </div>
              </div>

              {claimed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Réclamé
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  loading={claiming === event.type}
                  disabled={claiming !== null}
                  onClick={() => claim(event.type)}
                  data-testid={`claim-${event.type}`}
                >
                  Réclamer
                </Button>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-300" role="alert">
                {error}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
