'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Search } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useCarpool } from '@/hooks/useCarpool'
import { useKyc } from '@/hooks/useKyc'

interface GeoPoint {
  lat: number
  lng: number
  city: string
}

export default function NewCarpoolPage() {
  const router = useRouter()
  const { create } = useCarpool()
  const { isApproved } = useKyc()
  const [submitting, setSubmitting] = useState(false)
  const [from, setFrom] = useState<GeoPoint | null>(null)
  const [to, setTo] = useState<GeoPoint | null>(null)
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [lookingUp, setLookingUp] = useState<'from' | 'to' | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [priceEur, setPriceEur] = useState(5)
  const [description, setDescription] = useState('')
  const [womenOnly, setWomenOnly] = useState(false)
  const [silentRide, setSilentRide] = useState(false)
  const [petsAllowed, setPetsAllowed] = useState(false)

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
    if (submitting) return
    if (!from) {
      toast.error('Choisis ton point de départ.')
      return
    }
    if (!to) {
      toast.error('Choisis ta destination.')
      return
    }
    if (!date || !time) {
      toast.error('Indique la date et l’heure.')
      return
    }
    const iso = new Date(`${date}T${time}:00`).toISOString()
    if (new Date(iso).getTime() < Date.now() + 30 * 60 * 1000) {
      toast.error('Le départ doit être dans au moins 30 minutes.')
      return
    }

    setSubmitting(true)
    const { carpool, error } = await create({
      from_city: from.city,
      to_city: to.city,
      from_lat: from.lat,
      from_lng: from.lng,
      to_lat: to.lat,
      to_lng: to.lng,
      departure_at: iso,
      seats_total: seats,
      price_per_seat_eur: priceEur,
      description: description.trim() || null,
      women_only: womenOnly,
      silent_ride: silentRide,
      pets_allowed: petsAllowed,
    })
    setSubmitting(false)
    if (error || !carpool) {
      toast.error(error ?? 'Création impossible.')
      return
    }
    toast.success('Trajet publié 🚘')
    router.push(`/carpool/${carpool.id}`)
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
          Proposer un trajet
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          80 % du prix pour toi, 15 % plateforme, 5 % replantation. +50 Graines par passager.
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <CityPicker
          label="Départ"
          query={fromQuery}
          onQueryChange={setFromQuery}
          picked={from}
          onLookup={(q) => lookup('from', q)}
          busy={lookingUp === 'from'}
        />
        <CityPicker
          label="Destination"
          query={toQuery}
          onQueryChange={setToQuery}
          picked={to}
          onLookup={(q) => lookup('to', q)}
          busy={lookingUp === 'to'}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="carpool-date"
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
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
            step={0.5}
            value={priceEur}
            onChange={(e) => setPriceEur(Math.max(0, Math.min(500, Number(e.target.value))))}
            required
          />
        </div>

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
          disabled={!isApproved}
          variant="primary"
          className="w-full"
          data-testid="carpool-submit"
        >
          Publier mon trajet
        </Button>
      </form>
    </div>
  )
}

function CityPicker({
  label,
  query,
  onQueryChange,
  picked,
  onLookup,
  busy,
}: {
  label: string
  query: string
  onQueryChange: (q: string) => void
  picked: GeoPoint | null
  onLookup: (q: string) => void
  busy: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-[var(--text-secondary)]">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Ex : Frasne"
          className="flex-1 rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]/30"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onLookup(query)
            }
          }}
        />
        <button
          type="button"
          onClick={() => onLookup(query)}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.02] px-4 text-sm text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-50"
          aria-label="Rechercher l'adresse"
        >
          {busy ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cyan)] border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>
      {picked && (
        <p className="flex items-center gap-2 text-xs text-emerald-300">
          <MapPin className="h-3 w-3" />
          {picked.city} · {picked.lat.toFixed(3)}, {picked.lng.toFixed(3)}
        </p>
      )}
    </div>
  )
}

function CheckboxCard({
  checked,
  onChange,
  emoji,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  emoji: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition ${
        checked
          ? 'border-[var(--cyan)]/60 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--border-glow)]'
      }`}
    >
      <span className="text-xl" aria-hidden>
        {emoji}
      </span>
      <span>{label}</span>
    </button>
  )
}
