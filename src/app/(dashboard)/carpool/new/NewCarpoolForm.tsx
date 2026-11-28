'use client'

import { useRef, useState } from 'react'
import type { RepeatFormValues } from '@/lib/carpool-repeat'
import { upcomingDepartures, followingWeek } from '@/lib/carpool-schedule'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import CityPicker, { type GeoPoint } from './CityPicker'
import { ArrowLeft } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useCarpool } from '@/hooks/useCarpool'
import { useKyc } from '@/hooks/useKyc'
import CheckboxCard from '../components/CheckboxCard'

export default function NewCarpoolForm({ template }: { template?: RepeatFormValues }) {
  const router = useRouter()
  const { create } = useCarpool()
  const { isApproved } = useKyc()
  const pending = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [from, setFrom] = useState<GeoPoint | null>(null)
  const [to, setTo] = useState<GeoPoint | null>(null)
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [lookingUp, setLookingUp] = useState<'from' | 'to' | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [extraDates, setExtraDates] = useState<string[]>([])
  const [published, setPublished] = useState<Record<string, string>>({})
  const [seats, setSeats] = useState(template?.seats_total ?? 3)
  const [priceEur, setPriceEur] = useState(template ? template.price_per_seat_cents / 100 : 5)
  const [duration, setDuration] = useState(template?.estimated_duration_min?.toString() ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [womenOnly, setWomenOnly] = useState(template?.women_only ?? false)
  const [silentRide, setSilentRide] = useState(template?.silent_ride ?? false)
  const [petsAllowed, setPetsAllowed] = useState(template?.pets_allowed ?? false)

  async function lookup(which: 'from' | 'to', query: string) {
    if (query.trim().length < 3) {
      toast.error('Écris au moins 3 lettres (ex : Frasne).')
      return
    }
    setLookingUp(which)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr,be,ch,lu&q=${encodeURIComponent(
        query,
      )}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } })
      if (!res.ok) throw new Error('nominatim_failed')
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
      if (data.length === 0) {
        toast.error('Ville introuvable. Vérifie l’orthographe.')
        return
      }
      const first = data[0]!
      const cityLabel = first.display_name.split(',')[0] ?? query
      const point = { lat: Number(first.lat), lng: Number(first.lon), city: cityLabel }
      if (which === 'from') setFrom(point)
      else setTo(point)
    } catch {
      toast.error('Service de recherche indisponible. Réessaie.')
    } finally {
      setLookingUp(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending.current) return

    if (!date || !time) {
      toast.error('Indique la date et l’heure.')
      return
    }
    let departures: string[]
    try {
      departures = upcomingDepartures([date, ...extraDates], time)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Date invalide.')
      return
    }
    const route = template ? { repeat_from_id: template.id } : from && to ? {
      from_city: from.city, to_city: to.city,
      from_lat: from.lat, from_lng: from.lng,
      to_lat: to.lat, to_lng: to.lng,
    } : null
    if (!route) {
      toast.error('Choisis ton point de départ et ta destination.')
      return
    }
    pending.current = true
    setSubmitting(true)
    try {
      for (const departure of departures) {
        const { carpool, error, alreadyPublished } = await create({
          ...route,
          departure_at: departure,
          estimated_duration_min: duration === '' ? null : Number(duration),
          seats_total: seats,
          price_per_seat_eur: priceEur,
          description: description.trim() || null,
          women_only: womenOnly,
          silent_ride: silentRide,
          pets_allowed: petsAllowed,
        })
        if (error || !carpool) {
          toast.error(error ?? 'Création impossible.')
          return
        }
        setPublished(previous => ({ ...previous, [departure]: carpool.id }))
        if (departures.length === 1) {
          toast.success(alreadyPublished ? 'Ce départ était déjà publié. Voici sa fiche.' : 'Trajet publié')
          router.push(`/carpool/${carpool.id}`)
        }
      }
      if (departures.length > 1) toast.success('Les départs choisis sont disponibles.')
    } catch {
      toast.error('Confirmation indisponible. Vérifie tes trajets avant de réessayer.')
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

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
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          {template ? 'Reproposer ce trajet' : 'Proposer un trajet'}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          À la clôture d’une réservation, la répartition prévue est de 80 % pour toi, 15 % pour la plateforme et 5 % pour le fonds écologique. Les 50 Graines de base pour chaque participant sont ajustées selon sa formule.
        </p>
      </header>

      {!isApproved && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
          Tu dois vérifier ton identité avant de publier un trajet.{' '}
          <Link href="/kyc" className="underline hover:no-underline">
            Lancer la vérification
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-5">
          {template ? (
            <section className="space-y-1 rounded-xl border border-[var(--border)] p-4">
              <p>{template.from_city} → {template.to_city}</p>
              {template.meeting_point_label && <p>Rendez-vous · {template.meeting_point_label}</p>}
              <p className="text-sm text-[var(--text-secondary)]">Choisis le nouveau départ. Chaque passager réservera sa place.</p>
              <Link href="/carpool/new" className="text-sm text-[var(--cyan)] underline">Choisir d’autres lieux</Link>
            </section>
          ) : (
            <>
              <CityPicker
                label="Départ"
                query={fromQuery}
                onQueryChange={value => { setFromQuery(value); setFrom(null) }}
                picked={from}
                onLookup={(q) => lookup('from', q)}
                busy={lookingUp === 'from'}
              />
              <CityPicker
                label="Destination"
                query={toQuery}
                onQueryChange={value => { setToQuery(value); setTo(null) }}
                picked={to}
                onLookup={(q) => lookup('to', q)}
                busy={lookingUp === 'to'}
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="carpool-date"
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)}
              required
            />
            <Input
              id="carpool-time"
              type="time"
              label="Heure"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          {template && (
            <div className="space-y-2">
              {extraDates.map((value, index) => (
                <div key={index} className="flex items-end gap-2">
                  <Input id={`carpool-repeat-date-${index}`} type="date" label={`Départ ${index + 2}, à la même heure`}
                    value={value} required onChange={event => {
                      const newDate = event.target.value
                      setExtraDates(previous => previous.map((d, i) => i === index ? newDate : d))
                    }} />
                  <button type="button" className="text-sm underline" onClick={() => setExtraDates(previous => previous.filter((_, i) => i !== index))}>
                    Retirer
                  </button>
                </div>
              ))}
              {extraDates.length < 7 && (
                <button type="button" disabled={!date || submitting} className="text-sm text-[var(--cyan)] underline"
                  onClick={() => setExtraDates(previous => [...previous, followingWeek(previous[previous.length - 1] || date)])}>
                  Ajouter un autre départ à la même heure
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="carpool-seats"
              type="number"
              label="Places offertes"
              min={1}
              max={7}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(7, Number(e.target.value))))}
              required
            />
            <Input
              id="carpool-price"
              type="number"
              label="Prix par place (€)"
              min={0}
              max={500}
              step={0.01}
              value={priceEur}
              onChange={(e) => setPriceEur(Math.max(0, Math.min(500, Number(e.target.value))))}
              required
            />
          </div>

          <Input id="carpool-duration" type="number" label="Durée estimée en minutes (facultatif)"
            min={1} max={2147483647} step={1} value={duration} onChange={e => setDuration(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="carpool-desc" className="text-sm text-[var(--text-secondary)]">
              Description (optionnel)
            </label>
            <textarea
              id="carpool-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Point de rendez-vous exact, bagages, préférences…"
              className="w-full rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]/30"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <CheckboxCard
              checked={womenOnly}
              onChange={setWomenOnly}
              emoji="🌸"
              label="Femmes uniquement"
            />
            <CheckboxCard
              checked={silentRide}
              onChange={setSilentRide}
              emoji="🧘"
              label="Trajet silencieux"
            />
            <CheckboxCard
              checked={petsAllowed}
              onChange={setPetsAllowed}
              emoji="🐶"
              label="Animaux OK"
            />
          </div>

          <Button
            type="submit"
            loading={submitting}
            disabled={!isApproved || submitting}
            variant="primary"
            className="w-full"
            data-testid="carpool-submit"
          >
            {extraDates.length ? `Publier les ${extraDates.length + 1} départs` : 'Publier mon trajet'}
          </Button>
        </fieldset>
      </form>
      {Object.keys(published).length > 0 && (
        <section aria-live="polite" className="mt-5 space-y-2">
          <h2 className="font-semibold">Départs publiés</h2>
          {Object.entries(published).sort(([a], [b]) => a.localeCompare(b)).map(([departure, id]) => (
            <Link key={id} href={`/carpool/${id}`} className="block text-sm text-[var(--cyan)] underline">
              {new Date(departure).toLocaleString('fr-FR')}
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
