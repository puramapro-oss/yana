'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ArrivalFilter from './components/ArrivalFilter'
import CarpoolCard from './components/CarpoolCard'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import KycBanner from './components/KycBanner'
import { useCarpool, type SearchCarpoolInput } from '@/hooks/useCarpool'
import { useKyc } from '@/hooks/useKyc'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { SearchableCarpool } from '@/lib/carpool-arrival'
import type { Carpool, CarpoolBooking } from '@/types'

type Tab = 'search' | 'driver' | 'passenger'

export default function CarpoolPage() {
  const { mine_as_driver, mine_as_passenger, loading, error, search, refetch } = useCarpool()
  const { isApproved, status: kycStatus } = useKyc()
  const [tab, setTab] = useState<Tab>('search')
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Covoiturage 🚘
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Trouve une place ou partage un trajet que tu as déjà prévu.
          </p>
        </div>
        <Link
          href="/carpool/new"
          data-testid="carpool-create-link"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/20 transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Proposer</span>
        </Link>
      </header>

      {!isApproved && kycStatus !== 'processing' && <KycBanner />}

      <nav
        className="mb-4 inline-flex gap-1 rounded-full border border-[var(--border)] bg-white/[0.02] p-1"
        role="tablist"
        aria-label="Onglets covoiturage"
      >
        <TabBtn active={tab === 'search'} onClick={() => setTab('search')}>
          Recherche
        </TabBtn>
        <TabBtn active={tab === 'driver'} onClick={() => setTab('driver')}>
          Mes trajets
          {mine_as_driver.length > 0 && (
            <span className="ml-1 text-[10px] text-[var(--text-muted)]">({mine_as_driver.length})</span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'passenger'} onClick={() => setTab('passenger')}>
          Mes réservations
          {mine_as_passenger.length > 0 && (
            <span className="ml-1 text-[10px] text-[var(--text-muted)]">({mine_as_passenger.length})</span>
          )}
        </TabBtn>
      </nav>

      {tab !== 'search' && loading && <CarpoolSkeletonList />}

      {tab !== 'search' && !loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}{' '}
          <button onClick={refetch} className="underline hover:no-underline">
            Réessayer
          </button>
        </div>
      )}

      {tab === 'search' && (
        <Suspense fallback={<CarpoolSkeletonList />}>
          <CarpoolSearch search={search} canBook={isApproved} />
        </Suspense>
      )}

      {!loading && !error && tab === 'driver' && <DriverTab carpools={mine_as_driver} />}

      {!loading && !error && tab === 'passenger' && <PassengerTab bookings={mine_as_passenger} />}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-white/10 text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

function CarpoolSearch({ search, canBook }: {
  search: (input: SearchCarpoolInput) => Promise<SearchableCarpool[]>
  canBook: boolean
}) {
  const query = useSearchParams().toString()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ query: string; attempt: number; rows: SearchableCarpool[]; error?: string } | null>(null)
  useEffect(() => {
    let active = true
    const params = new URLSearchParams(query)
    const get = (name: string) => params.get(name) ?? undefined
    const number = (name: string) => {
      const value = get(name)
      return value?.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined
    }
    search({
      from_city: get('from'), to_city: get('to'), departure_after: get('departure_after'),
      arrive_by: get('arrive_by'), min_seats: get('min_seats'), exclude_id: get('exclude_id'),
      departure_from: get('from_at'), departure_to: get('to_at'), women_only: get('women_only') === '1',
      from_lat: number('from_lat'), from_lng: number('from_lng'), to_lat: number('to_lat'), to_lng: number('to_lng'),
      silent_ride: get('silent_ride') === '1', pets_allowed: get('pets_allowed') === '1',
    }).then(rows => {
      if (active) setResult({ query, attempt, rows })
    }).catch((reason: unknown) => {
      if (active) setResult({ query, attempt, rows: [], error: reason instanceof Error ? reason.message : 'Recherche impossible.' })
    })
    return () => { active = false }
  }, [search, query, attempt])
  const current = result?.query === query && result.attempt === attempt ? result : null
  return (
    <>
      <ArrivalFilter key={query} query={query} />
      {current?.error ? (
        <p role="alert" className="text-sm">{current.error}{' '}
          <button className="underline" onClick={() => setAttempt(n => n + 1)}>Réessayer</button>
        </p>
      ) : (
        <SearchTab results={current?.rows ?? []} loading={!current} canBook={canBook} filtered={Boolean(query)} />
      )}
    </>
  )
}

function SearchTab({
  results,
  loading,
  canBook,
  filtered,
}: {
  results: SearchableCarpool[]
  loading: boolean
  canBook: boolean
  filtered: boolean
}) {
  if (loading) return <CarpoolSkeletonList />
  if (results.length === 0) {
    return (
      <EmptyState
        icon="🚗"
        title={filtered ? 'Aucun trajet correspondant' : 'Pas encore de trajet'}
        description={
          filtered
            ? 'Tu peux élargir la recherche. Avec une heure limite, seuls les trajets dont l’arrivée peut être estimée sont affichés.'
            : canBook ? 'Tu peux proposer un trajet déjà prévu.' : 'Vérifie ton identité pour proposer un trajet.'
        }
        action={
          <Link
            href="/carpool/new"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Proposer un trajet
          </Link>
        }
      />
    )
  }
  return (
    <ul className="space-y-2" data-testid="carpool-search-list">
      {results.map((c) => (
        <li key={c.id}>
          <CarpoolCard carpool={c} />
        </li>
      ))}
    </ul>
  )
}

function DriverTab({ carpools }: { carpools: Carpool[] }) {
  if (carpools.length === 0) {
    return (
      <EmptyState
        icon="🛞"
        title="Tu n'as pas encore proposé de trajet"
        description="Propose une place sur un de tes prochains déplacements."
        action={
          <Link
            href="/carpool/new"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--cyan)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Proposer un trajet
          </Link>
        }
      />
    )
  }
  return (
    <ul className="space-y-2" data-testid="carpool-driver-list">
      {carpools.map((c) => (
        <li key={c.id}>
          <CarpoolCard carpool={c} asDriver />
        </li>
      ))}
    </ul>
  )
}

function PassengerTab({ bookings }: { bookings: CarpoolBooking[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon="🎒"
        title="Pas encore de réservation"
        description="Trouve un trajet qui t'emmène où tu veux, sans stress et sans t'asseoir seul sur la route."
      />
    )
  }
  return (
    <ul className="space-y-2" data-testid="carpool-passenger-list">
      {bookings.map((b) => (
        <li key={b.id}>
          <BookingCard booking={b} />
        </li>
      ))}
    </ul>
  )
}

function BookingCard({ booking }: { booking: CarpoolBooking }) {
  return (
    <Link
      href={`/carpool/${booking.carpool_id}`}
      data-testid="booking-card"
      className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 transition hover:border-[var(--border-glow)] hover:bg-white/[0.04]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          🎒
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            Réservation · {booking.seats} place{booking.seats > 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {formatDateTime(booking.booked_at)} · {statusLabel(booking.status)}
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {formatPrice(booking.total_price_cents)}
        </p>
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

function statusLabel(s: string) {
  return {
    pending: 'En attente',
    confirmed: 'Confirmée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée',
    disputed: 'En litige',
  }[s] ?? s
}

function CarpoolSkeletonList() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="skeleton h-16 rounded-xl" />
      ))}
    </ul>
  )
}
