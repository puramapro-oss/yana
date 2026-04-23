'use client'

import { Medal, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  referrals: number
  missions: number
  rank: number
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

const RANK_COLORS: Record<number, string> = {
  1: 'from-amber-400 to-yellow-600 text-amber-950',
  2: 'from-slate-300 to-slate-500 text-slate-900',
  3: 'from-orange-400 to-amber-700 text-amber-100',
}

export default function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title="Classement vide cette semaine"
        description="Sois le premier à parrainer ou finir une mission pour apparaître dans le top 10."
      />
    )
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e) => {
        const isMe = currentUserId && e.userId === currentUserId
        const gradient = RANK_COLORS[e.rank]
        return (
          <li
            key={e.userId}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 transition sm:p-4',
              isMe
                ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/5 ring-1 ring-[var(--cyan)]/30'
                : 'border-[var(--border)] bg-white/[0.02]',
            )}
            data-testid={`leaderboard-rank-${e.rank}`}
          >
            <div
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] font-bold',
                gradient
                  ? `bg-gradient-to-br ${gradient}`
                  : 'bg-white/5 text-[var(--text-secondary)]',
              )}
              aria-label={`Rang ${e.rank}`}
            >
              {e.rank <= 3 ? (
                <Trophy className="h-5 w-5" />
              ) : (
                <span className="text-sm">{e.rank}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)] sm:text-base">
                {e.displayName}
                {isMe && <span className="ml-2 text-xs text-[var(--cyan)]">(toi)</span>}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {e.referrals > 0 && `${e.referrals} parrainage${e.referrals > 1 ? 's' : ''}`}
                {e.referrals > 0 && e.missions > 0 && ' · '}
                {e.missions > 0 && `${e.missions} mission${e.missions > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-right">
              <Medal className="h-4 w-4 text-[var(--cyan)]" />
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                {e.score}
              </span>
              <span className="hidden text-xs text-[var(--text-muted)] sm:inline">pts</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
