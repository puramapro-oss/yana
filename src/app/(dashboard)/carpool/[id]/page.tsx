'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, MapPin, Users, Calendar, ShieldCheck, ShieldAlert,
  Flag, MessageSquare, Leaf, Trash2, CheckCircle2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { useCarpool } from '@/hooks/useCarpool'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { Carpool, CarpoolBooking } from '@/types'

interface DriverView {
  id: string
  full_name: string
  avatar_url: string | null
  trust_score: number | null
  sanskrit_level: string | null
  kyc_approved: boolean
}

interface Detail {
  carpool: Carpool
  driver: DriverView | null
  my_booking: CarpoolBooking | null
  is_driver: boolean
}

interface SafeWalkContact {
  name: string
  phone: string
}

export default function CarpoolDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { book, complete } = useCarpool()

  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [bookBusy, setBookBusy] = useState(false)
  const [seats, setSeats] = useState(1)
  const [contacts, setContacts] = useState<SafeWalkContact[]>([{ name: '', phone: '' }])

  useEffect(() => {
    if (!params?.id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(`/api/carpool/${params.id}`)
        const payload = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setLoadError(payload.error ?? 'Trajet indisponible.')
        } else {
          setDetail(payload as Detail)
        }
      } catch {
        if (!cancelled) setLoadError('Connexion impossible.')
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
      const res = await fetch(`/api/carpool/${params.id}`)
      const payload = await res.json().catch(() => ({}))
      if (res.ok) setDetail(payload as Detail)
      else setLoadError(payload.error ?? 'Indisponible.')
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

  async function handleComplete() {
    if (!detail?.my_booking) return
    if (!confirm('Marquer ce trajet comme terminé ? Le paiement du conducteur sera libéré.')) return
    const { error } = await complete(detail.my_booking.id)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Trajet clôturé. +50 Graines pour chacun 🌱')
    await refetch()
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
  const alreadyBooked = my_booking !== null
  const seatsOK = carpool.seats_remaining > 0 && carpool.status === 'open'
  const isFinished = carpool.status === 'completed' || my_booking?.status === 'completed'

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

      {/* Driver card */}
      {driver && !is_driver && (
        <div className="glass-card-static mb-6 flex items-center gap-4 p-5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] text-sm font-bold text-white"
            aria-hidden
          >
            {driver.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--text-primary)]">{driver.full_name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {driver.kyc_approved ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Vérifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <ShieldAlert className="h-3 w-3" />
                  En attente
                </span>
              )}
              {driver.trust_score != null && (
                <span>Trust {driver.trust_score}/100</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trip attributes */}
      <ul className="mb-6 grid gap-2 sm:grid-cols-3">
        <AttrBadge active={carpool.women_only} emoji="🌸" label="Femmes uniquement" />
        <AttrBadge active={carpool.silent_ride} emoji="🧘" label="Trajet silencieux" />
        <AttrBadge active={carpool.pets_allowed} emoji="🐶" label="Animaux OK" />
      </ul>

      {carpool.description && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <MessageSquare className="h-3 w-3" />
            Message du conducteur
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {carpool.description}
          </p>
        </div>
      )}

      {/* Price + CTA */}
      <div className="glass-card-static flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Prix par place</p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            {formatPrice(carpool.price_per_seat_cents)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
            <Leaf className="h-3 w-3" />
            +50 Graines pour chacun
          </p>
        </div>

        {isFinished ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Trajet terminé
          </span>
        ) : is_driver ? (
          <span className="rounded-full bg-white/5 px-4 py-2 text-xs text-[var(--text-secondary)]">
            Tu es le conducteur
          </span>
        ) : alreadyBooked ? (
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              Réservé · {my_booking!.seats} place{my_booking!.seats > 1 ? 's' : ''}
            </span>
            <Button
              onClick={handleComplete}
              variant="secondary"
              size="sm"
              data-testid="carpool-complete"
            >
              Marquer terminé
            </Button>
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

      {/* Admin actions si driver de ce trajet */}
      {is_driver && !isFinished && (
        <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <Flag className="h-3 w-3" />
          Tu géreras ce trajet le jour J. Les passagers peuvent marquer "terminé" après coup pour libérer ton paiement.
        </div>
      )}

      {/* Safe Walk contacts si my_booking */}
      {my_booking && my_booking.safe_walk_contacts.length > 0 && (
        <section className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
            Safe Walk · {my_booking.safe_walk_contacts.length} contact(s) prévenu(s)
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Le jour J, ces personnes pourront suivre ta position en temps réel.
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
      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Réserver ce trajet"
        className="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleBook()
          }}
          className="flex flex-col gap-4"
        >
          <Input
            id="book-seats"
            type="number"
            label="Nombre de places"
            min={1}
            max={carpool.seats_remaining}
            value={seats}
            onChange={(e) => {
              const n = Math.max(1, Math.min(carpool.seats_remaining, Number(e.target.value)))
              setSeats(n)
            }}
            required
          />

          <div>
            <p className="text-sm text-[var(--text-secondary)]">Safe Walk · jusqu&apos;à 3 contacts</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Optionnel. Ces personnes pourront suivre ta position le jour J.
            </p>
            <div className="mt-3 space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => {
                      const next = [...contacts]
                      next[i] = { ...c, name: e.target.value }
                      setContacts(next)
                    }}
                    placeholder="Prénom"
                    className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    maxLength={100}
                  />
                  <input
                    type="tel"
                    value={c.phone}
                    onChange={(e) => {
                      const next = [...contacts]
                      next[i] = { ...c, phone: e.target.value }
                      setContacts(next)
                    }}
                    placeholder="+33…"
                    className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    maxLength={30}
                  />
                  {contacts.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Retirer ce contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {contacts.length < 3 && (
                <button
                  type="button"
                  onClick={() => setContacts([...contacts, { name: '', phone: '' }])}
                  className="text-xs text-[var(--cyan)] underline hover:no-underline"
                >
                  + Ajouter un contact
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 text-sm">
            <span className="text-[var(--text-secondary)]">Total</span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)] tabular-nums">
              {formatPrice(carpool.price_per_seat_cents * seats)}
            </span>
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            Paiement Stripe activé en P3. En dev YANA le trajet est confirmé sans paiement réel.{' '}
            <Link href="/cgv" className="underline">Conditions</Link>
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setBookOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={bookBusy} data-testid="carpool-book-confirm">
              Confirmer
            </Button>
          </div>
        </form>
      </Modal>

      <p className="mt-6 text-center text-[11px] text-[var(--text-muted)]">
        Connecté en tant que {profile?.full_name ?? 'Utilisateur YANA'}
      </p>
    </div>
  )
}

function AttrBadge({ active, emoji, label }: { active: boolean; emoji: string; label: string }) {
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
        active
          ? 'border-[var(--cyan)]/40 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-muted)]'
      }`}
    >
      <span className="text-base" aria-hidden>
        {emoji}
      </span>
      <span>{label}</span>
      {!active && <span className="ml-auto opacity-60">—</span>}
    </li>
  )
}
