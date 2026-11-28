'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, MapPin, Users, Calendar, ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useCarpool } from '@/hooks/useCarpool'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime, formatPrice } from '@/lib/utils'
import { applyPlanMultiplierToSeeds, SEEDS_PER_SIDE } from '@/lib/dual-reward'
import { PLANS } from '@/lib/constants'
import type { Detail, SafeWalkContact } from './types'
import CarpoolTripDetails from './components/CarpoolTripDetails'
import BookingModal from './components/BookingModal'
import CarpoolReceipt from './components/CarpoolReceipt'
import CarpoolConfirmation from './components/CarpoolConfirmation'
import CarpoolFallback from './components/CarpoolFallback'
import CarpoolDirections from './components/CarpoolDirections'
import CancelCarpoolAction from './components/CancelCarpoolAction'
import ShareCarpool from './components/ShareCarpool'
import { fetchCarpoolDetail } from './utils'

export default function CarpoolDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { book, complete } = useCarpool()

  const [detail, setDetail] = useState<Detail | null>(null); const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [bookBusy, setBookBusy] = useState(false); const [seats, setSeats] = useState(1)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [contacts, setContacts] = useState<SafeWalkContact[]>([{ name: '', phone: '' }])

  useEffect(() => {
    if (!params?.id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const detail = await fetchCarpoolDetail(params.id)
        if (!cancelled) setDetail(detail)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Connexion impossible.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params?.id])

  async function refetch() {
    if (!params?.id) return
    setLoading(true)
    try {
      setDetail(await fetchCarpoolDetail(params.id))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Indisponible.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBook() {
    if (!detail) return
    setBookBusy(true)
    const filtered = contacts
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
      .filter((c) => c.name && c.phone)
    const { error, kyc_required } = await book(detail.carpool.id, {
      seats,
      safe_walk_contacts: filtered,
    })
    setBookBusy(false)
    if (error) {
      toast.error(error)
      if (kyc_required) router.push('/kyc')
      return
    }
    toast.success('Place réservée 🎉')
    setBookOpen(false)
    await refetch()
  }

  async function handleComplete(bookingId: string) {
    if (confirming || !window.confirm('Confirmes-tu avoir effectué ce trajet avec l’autre participant ?')) return
    setConfirming(bookingId)
    try {
      const { error } = await complete(bookingId)
      if (error) {
        toast.error(error)
        return
      }
      toast.success('Ta confirmation a été enregistrée.')
      await refetch()
    } catch {
      toast.error('Confirmation non vérifiée. Recharge le trajet pour consulter son état.')
    } finally {
      setConfirming(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="skeleton mb-4 h-6 w-40 rounded" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  if (loadError || !detail) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/carpool"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError ?? 'Trajet introuvable.'}
        </div>
      </div>
    )
  }

  const { carpool, driver, my_booking, is_driver } = detail
  const cancelled = carpool.status === 'cancelled' || my_booking?.status === 'cancelled'
  const disputed = my_booking?.status === 'disputed'
  const canConfirm = my_booking?.status === 'confirmed' || my_booking?.status === 'in_progress'
  const seatsOK = carpool.seats_remaining > 0 && carpool.status === 'open'
  const isFinished = carpool.status === 'completed' || my_booking?.status === 'completed'

  const plan = profile?.role === 'super_admin' ? 'legende' : profile?.plan
  const estimatedSeeds = plan && PLANS[plan]
    ? applyPlanMultiplierToSeeds(SEEDS_PER_SIDE, PLANS[plan].multiplier)
    : undefined

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/carpool"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au covoiturage
      </Link>

      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)]">
          {carpool.from_city} → {carpool.to_city}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDateTime(carpool.departure_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" />
            {carpool.seats_remaining}/{carpool.seats_total} places
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {carpool.meeting_point_label ?? 'Point de RDV partagé après réservation'}
          </span>
        </p>
      </header>

      {!cancelled && !disputed && !isFinished && <CarpoolDirections carpool={carpool} booking={my_booking} isDriver={is_driver} />}
      {cancelled && <CarpoolFallback carpool={carpool} booking={my_booking} />}

      <CarpoolTripDetails carpool={carpool} driver={driver} is_driver={is_driver} />

      {/* Price + CTA */}
      <div className="glass-card-static flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Prix par place</p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            {formatPrice(carpool.price_per_seat_cents)}
          </p>
        </div>

        {cancelled || disputed ? (
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{cancelled ? 'Annulé' : 'En litige'}</span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Trajet terminé
          </span>
        ) : is_driver ? (
          <span className="rounded-full bg-white/5 px-4 py-2 text-xs text-[var(--text-secondary)]">
            Tu es le conducteur
          </span>
        ) : my_booking ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{my_booking.status === 'pending' ? 'En attente' : 'Réservé'} · {my_booking.seats} place{my_booking.seats > 1 ? 's' : ''}</p>
            {canConfirm && (
              <CarpoolConfirmation
                confirmed={detail.my_confirmation?.passenger_confirmed === true}
                otherConfirmed={detail.my_confirmation?.driver_confirmed === true}
                departureAt={carpool.departure_at}
                other="conducteur"
                disabled={confirming !== null}
                busy={confirming === my_booking.id}
                onConfirm={() => void handleComplete(my_booking.id)}
              />
            )}
          </div>
        ) : (
          <Button
            onClick={() => setBookOpen(true)}
            disabled={!seatsOK}
            variant="primary"
            data-testid="carpool-book"
          >
            {seatsOK ? 'Réserver' : 'Complet'}
          </Button>
        )}
      </div>

      {my_booking && (
        <div className="mt-4">
          <CarpoolReceipt
            totalCents={my_booking.total_price_cents} booking={my_booking} cancelled={cancelled}
            settlement={detail.my_confirmation?.settlement} mySeeds={detail.my_confirmation?.my_seeds}
          />
        </div>
      )}

      {is_driver && carpool.status === 'completed' && (
        <Link href={`/carpool/new?repeat=${carpool.id}`} className="mt-4 inline-block text-sm text-[var(--cyan)] underline">
          Reproposer ce trajet
        </Link>
      )}
      {is_driver && seatsOK && <ShareCarpool carpoolId={carpool.id} />}
      {is_driver && (detail.driver_bookings?.length ?? 0) > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="font-semibold">Réservations des passagers</h2>
          {detail.driver_bookings.map((booking) => (
            <div key={booking.id} className="space-y-2 rounded-xl border border-[var(--border)] p-4">
              <p className="text-sm font-medium">Réservation {booking.id.slice(0, 8)} · {booking.seats} place{booking.seats > 1 ? 's' : ''}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {{ pending: 'En attente', confirmed: 'Réservée', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée', disputed: 'En litige' }[booking.status]}
              </p>
              {!cancelled && (booking.status === 'confirmed' || booking.status === 'in_progress') && (
                <CarpoolConfirmation
                  confirmed={booking.driver_confirmed}
                  otherConfirmed={booking.passenger_confirmed}
                  departureAt={carpool.departure_at}
                  other="passager" disabled={confirming !== null} busy={confirming === booking.id}
                  onConfirm={() => void handleComplete(booking.id)}
                />
              )}
              <CarpoolReceipt totalCents={booking.total_price_cents} booking={booking} cancelled={cancelled}
                settlement={booking.settlement} mySeeds={booking.my_seeds} />
            </div>
          ))}
        </section>
      )}

      <CancelCarpoolAction carpool={carpool} booking={my_booking} isDriver={is_driver} onCancelled={refetch} />

      {/* Safe Walk contacts si my_booking */}
      {my_booking && !cancelled && !disputed && my_booking.safe_walk_contacts.length > 0 && (
        <section className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
            Safe Walk · {my_booking.safe_walk_contacts.length} contact(s) enregistré(s)
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Contacts choisis pour ce trajet.
          </p>
          <ul className="mt-3 space-y-1.5">
            {my_booking.safe_walk_contacts.map((c, i) => (
              <li
                key={`${c.phone}-${i}`}
                className="flex items-center gap-2 text-xs text-[var(--text-primary)]"
              >
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                {c.name} · {c.phone}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Booking modal */}
      <BookingModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        carpool={carpool}
        seats={seats}
        estimatedSeeds={estimatedSeeds}
        onSeatsChange={setSeats}
        contacts={contacts}
        onContactsChange={setContacts}
        onBook={handleBook}
        busy={bookBusy}
      />

      <p className="mt-6 text-center text-[11px] text-[var(--text-muted)]">
        Connecté en tant que {profile?.full_name ?? 'Utilisateur YANA'}
      </p>
    </div>
  )
}
