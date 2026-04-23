'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationItem, { type NotificationItemData } from '@/components/notifications/NotificationItem'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'

type Filter = 'all' | 'unread'

interface NotificationsResponse {
  notifications: NotificationItemData[]
  unreadCount: number
}

export default function NotificationsPage() {
  const { loading: authLoading, user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItemData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications?limit=50', { cache: 'no-store' })
      if (!res.ok) {
        setError('Impossible de charger tes notifications. Réessaie.')
        setLoading(false)
        return
      }
      const body: NotificationsResponse = await res.json()
      setNotifications(body.notifications)
      setUnreadCount(body.unreadCount)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchData()
  }, [user, fetchData])

  async function markRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    setUnreadCount((c) => Math.max(0, c - 1))
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    })
    if (!res.ok) {
      // Rollback
      await fetchData()
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return
    setBusy(true)
    // Optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    })
    if (!res.ok) {
      await fetchData()
    }
    setBusy(false)
  }

  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter],
  )

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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
            <Bell className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
            Notifications
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--cyan)]/15 px-2.5 py-1 text-xs font-medium text-[var(--cyan)]">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Achievements, parrainages, gains wallet, tirages… tout ce que tu ne veux pas rater.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="md"
            onClick={markAllRead}
            loading={busy}
            icon={<CheckCheck size={16} />}
            data-testid="notif-mark-all-read"
          >
            Tout marquer comme lu
          </Button>
        )}
      </header>

      <div className="flex gap-2" role="tablist">
        {([
          { key: 'all' as Filter, label: `Toutes · ${notifications.length}` },
          { key: 'unread' as Filter, label: `Non lues · ${unreadCount}` },
        ]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? 'rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-4 py-2 text-xs font-medium text-white'
                : 'rounded-full border border-[var(--border)] bg-white/[0.02] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
            data-testid={`notif-filter-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} />}
          title={filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          description={
            filter === 'unread'
              ? 'Tu es à jour. Les nouvelles notifs apparaîtront ici.'
              : 'On te préviendra ici quand tu débloques un achievement, quand un filleul s\'inscrit, ou quand tu gagnes au tirage.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((n) => (
            <NotificationItem key={n.id} item={n} onMarkRead={markRead} />
          ))}
        </ul>
      )}
    </div>
  )
}
