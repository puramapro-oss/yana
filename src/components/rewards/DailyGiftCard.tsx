'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Flame, Gift, Percent, Sparkles, Ticket, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface Status {
  canOpen: boolean
  lastOpenedAt: string | null
  streakCount: number
  lastGift: { gift_type: string; gift_value: number } | null
}

interface OpenResult {
  giftType: string
  giftValue: number
  streakCount: number
  newPointsBalance: number
}

const GIFT_ICONS: Record<string, { icon: LucideIcon; label: (value: number) => string; color: string }> = {
  points: {
    icon: Sparkles,
    label: (v) => `+${v} points`,
    color: 'text-[var(--cyan)]',
  },
  coupon_percent: {
    icon: Percent,
    label: (v) => `−${v}% coupon`,
    color: 'text-emerald-300',
  },
  ticket: {
    icon: Ticket,
    label: (v) => `+${v} ticket${v > 1 ? 's' : ''}`,
    color: 'text-amber-300',
  },
  credits: {
    icon: Zap,
    label: (v) => `+${v} crédits`,
    color: 'text-violet-300',
  },
  jackpot: {
    icon: Gift,
    label: (v) => `Jackpot +${v}`,
    color: 'text-pink-300',
  },
}

export default function DailyGiftCard() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OpenResult | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/daily-gift', { cache: 'no-store' })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const body: Status = await res.json()
      setStatus(body)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchStatus()
  }, [user, fetchStatus])

  async function open() {
    setOpening(true)
    setError(null)
    try {
      const res = await fetch('/api/daily-gift', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Ouverture impossible.')
        setOpening(false)
        return
      }
      setResult({
        giftType: body.giftType,
        giftValue: body.giftValue,
        streakCount: body.streakCount,
        newPointsBalance: body.newPointsBalance,
      })
      fetchStatus()
    } catch {
      setError('Erreur réseau. Réessaie.')
    } finally {
      setOpening(false)
    }
  }

  if (!user || loading || !status) {
    return null
  }

  const streakDisplay = status.streakCount > 0 ? status.streakCount : 0

  return (
    <>
      <div
        className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6"
        data-testid="daily-gift-card"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[var(--purple)]/10 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div
            className={
              status.canOpen
                ? 'grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-3xl text-white shadow-lg shadow-amber-500/20'
                : 'grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/5 text-3xl text-[var(--text-muted)]'
            }
            aria-hidden
          >
            🎁
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Cadeau quotidien</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
              {status.canOpen ? 'Ton cadeau t\'attend' : 'Reviens demain'}
            </p>
            {streakDisplay > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                Streak {streakDisplay} jour{streakDisplay > 1 ? 's' : ''}
                {streakDisplay >= 7 && <span className="ml-1 text-emerald-300">· -10% garanti</span>}
              </p>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={open}
            loading={opening}
            disabled={!status.canOpen || opening}
            data-testid="open-daily-gift"
          >
            {status.canOpen ? 'Ouvrir' : 'Verrouillé'}
          </Button>
        </div>

        {error && (
          <div className="relative mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title="🎁 Ton cadeau"
      >
        {result && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              {(() => {
                const entry = GIFT_ICONS[result.giftType] ?? GIFT_ICONS.points
                const Icon = entry.icon
                return (
                  <>
                    <div className={`grid h-20 w-20 place-items-center rounded-full bg-white/5 ${entry.color}`}>
                      <Icon className="h-10 w-10" />
                    </div>
                    <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
                      {entry.label(result.giftValue)}
                    </p>
                  </>
                )
              })()}

              {result.streakCount >= 7 && (
                <p className="flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-300">
                  <Flame className="h-3.5 w-3.5" />
                  Streak {result.streakCount} jours
                </p>
              )}
            </div>

            {result.giftType === 'points' && (
              <p className="text-center text-sm text-[var(--text-secondary)]">
                Nouveau solde :{' '}
                <strong className="text-[var(--text-primary)]">
                  {result.newPointsBalance.toLocaleString('fr-FR')} pts
                </strong>
              </p>
            )}

            {result.giftType === 'coupon_percent' && (
              <p className="text-center text-xs text-[var(--text-muted)]">
                Ton coupon est automatiquement actif sur ton prochain achat.
              </p>
            )}

            <Button variant="primary" size="md" onClick={() => setResult(null)}>
              Génial !
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
