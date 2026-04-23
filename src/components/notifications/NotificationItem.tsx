'use client'

import {
  Award, Bell, Coins, Gift, Leaf, Sparkles, Ticket, Trophy, UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'

export interface NotificationItemData {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

interface NotificationItemProps {
  item: NotificationItemData
  onMarkRead: (id: string) => void
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  achievement: Award,
  referral: UserPlus,
  wallet: Coins,
  tree: Leaf,
  contest: Trophy,
  lottery: Ticket,
  daily_gift: Gift,
  birthday: Sparkles,
  mission: Bell,
}

function pickIcon(type: string): LucideIcon {
  return TYPE_ICONS[type] ?? Bell
}

export default function NotificationItem({ item, onMarkRead }: NotificationItemProps) {
  const Icon = pickIcon(item.type)

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 transition sm:p-4',
        item.read
          ? 'border-[var(--border)] bg-white/[0.015] opacity-80'
          : 'border-[var(--cyan)]/30 bg-[var(--cyan)]/5',
      )}
      data-testid={`notification-${item.id}`}
    >
      <div
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full',
          item.read ? 'bg-white/5 text-[var(--text-muted)]' : 'bg-[var(--cyan)]/15 text-[var(--cyan)]',
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
          <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
            {formatDateTime(item.created_at)}
          </span>
        </div>
        {item.body && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.body}</p>
        )}
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            className="mt-2 text-xs text-[var(--cyan)] hover:underline"
            data-testid={`mark-read-${item.id}`}
          >
            Marquer comme lu
          </button>
        )}
      </div>
    </li>
  )
}
