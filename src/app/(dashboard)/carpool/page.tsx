'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, MapPin, Users, ChevronRight, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useCarpool } from '@/hooks/useCarpool'
import { useKyc } from '@/hooks/useKyc'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { Carpool, CarpoolBooking } from '@/types'

type Tab = 'search' | 'driver' | 'passenger'

export default function CarpoolPage() {
  const { mine_as_driver, mine_as_passenger, loading, error, search, refetch } = useCarpool()
  const { isApproved, status: kycStatus } = useKyc()
  const [tab, setTab] = useState<Tab>('search')
  const [searchResults, setSearchResults] = useState<Carpool[]>([])
  const [searching, setSearching] = useState(true)

  useEffect(() => {
    let cancelled = false
    setSearching(true)
    search({}).then((rows) => {
      if (!cancelled) {
        setSearchResults(rows)
        setSearching(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Covoiturage 🚘
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Dual Reward : 80 % pour le conducteur, 5 % pour planter des arbres, 50 Graines chacun.
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

      {!isApproved && kycStatus !== 'processing' && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-amber-300" />
            <p className="text-sm text-amber-100">
              Vérifie ton identité pour réserver ou proposer un trajet. On protège tout le monde.
            </p>
          </div>
          <Link
            href="/kyc"
            className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/25"
          >
            Lancer la vérification
          </Link>
        </div>
      )}

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

      {loading && <CarpoolSkeletonList />}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}{' '}
          <button onClick={refetch} className="underline hover:no-underline">
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && tab === 'search' && (
        <SearchTab results={searchResults} loading={searching} canBook={isApproved} />
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

function SearchTab({
  results,
  loading,
  canBook,
}: {
  results: Carpool[]
  loading: boolean
  canBook: boolean
}) {
  if (loading) return <CarpoolSkeletonList />
  if (results.length === 0) {
    return (
      <EmptyState
        icon="🚗"
        title="Pas encore de trajet"
        description={
          canBook
            ? 'Sois le premier à proposer un covoiturage. Tu gagnes 80 % du prix + 50 Graines par passager.'
            : "Personne n'a encore proposé de trajet près de chez toi. Vérifie ton identité et propose le premier."
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
        description="Ouvre une place à un voisin, gagne des Graines et de l'argent."
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

function CarpoolCard({ carpool, asDriver }: { carpool: Carpool; asDriver?: boolean }) {
  return (
    <Link
      href={`/carpool/${carpool.id}`}
      data-testid="carpool-card"
      className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 transition hover:border-[var(--border-glow)] hover:bg-white/[0.04]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--text-primary)]">
            {carpool.from_city} → {carpool.to_city}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {formatDateTime(carpool.departure_at)} ·{' '}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {carpool.seats_remaining}/{carpool.seats_total}
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)] tabular-nums">
            {formatPrice(carpool.price_per_seat_cents)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">/ place</p>
        </div>
        {asDriver && carpool.status === 'completed' && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Terminé
          </span>
        )}
        {asDriver && carpool.status === 'full' && (
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            Complet
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-0.5" />
      </div>
    </Link>
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
