'use client'

import { useState, useSyncExternalStore, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { localDateTime, localDeadlineOptions, parseCarpoolInstant } from '@/lib/carpool-arrival'

// The device's zone is only known in the browser, including on SSR routes.
const subscribe = () => () => {}
const inBrowser = () => true
const onServer = () => false

export default function ArrivalFilter({ query }: { query: string }) {
  const ready = useSyncExternalStore(subscribe, inBrowser, onServer)
  return ready ? <LocalArrivalFilter query={query} /> : null
}

function LocalArrivalFilter({ query }: { query: string }) {
  const router = useRouter()
  const params = new URLSearchParams(query)
  const deadline = params.get('arrive_by')
  const instant = deadline ? parseCarpoolInstant(deadline) : null
  const [input, setInput] = useState(instant == null ? '' : localDateTime(instant))
  const [silent, setSilent] = useState(params.get('silent_ride') === '1')
  const [pets, setPets] = useState(params.get('pets_allowed') === '1')
  const [ambiguous, setAmbiguous] = useState<Date[]>([])
  const [error, setError] = useState('')
  const from = params.get('from')
  const to = params.get('to')
  const seats = params.get('min_seats')
  const departure = parseCarpoolInstant(params.get('departure_after') ?? '')
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

  function search(value: Date | null) {
    const next = new URLSearchParams(query)
    if (value) next.set('arrive_by', value.toISOString())
    else next.delete('arrive_by')
    if (silent) next.set('silent_ride', '1')
    else next.delete('silent_ride')
    if (pets) next.set('pets_allowed', '1')
    else next.delete('pets_allowed')
    const filters = next.toString()
    router.replace(filters ? `/carpool?${filters}` : '/carpool', { scroll: false })
  }

  function apply(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!input) return search(null)
    // Un changement de confort conserve l'instant déjà choisi (secondes et heure d'hiver incluses).
    if (instant != null && input === localDateTime(instant)) return search(new Date(instant))
    const options = localDeadlineOptions(input)
    if (!options.length) return setError("Cette heure n’existe pas dans ton fuseau. Choisis une autre heure.")
    if (options.length > 1) return setAmbiguous(options)
    search(options[0])
  }

  return (
    <form onSubmit={apply} className="mb-4 space-y-2 rounded-xl border border-[var(--border)] p-4">
      {(from || to || seats || departure != null) && (
        <p className="text-sm text-[var(--text-secondary)]">
          {[from && `Depuis ${from}`, to && `vers ${to}`,
            seats && `${seats} ${seats === '1' ? 'place' : 'places'}`,
            departure != null && `départ à partir du ${new Date(departure).toLocaleString('fr-FR')}`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Préférences de confort</legend>
        <div className="flex flex-wrap gap-x-5">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="silent_ride" checked={silent} onChange={event => setSilent(event.target.checked)} />
            Trajet silencieux
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="pets_allowed" checked={pets} onChange={event => setPets(event.target.checked)} />
            Animaux acceptés
          </label>
        </div>
      </fieldset>
      <label htmlFor="carpool-arrive-by" className="block text-sm font-medium">Arriver au plus tard le</label>
      <div className="flex flex-wrap items-center gap-3">
        <input id="carpool-arrive-by" type="datetime-local" value={input}
          onChange={event => { setInput(event.target.value); setError(''); setAmbiguous([]) }}
          aria-describedby="carpool-timezone"
          className="max-w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] p-2" />
        <button type="submit" className="rounded-full bg-[var(--cyan)] px-4 py-2 text-sm font-semibold text-slate-950">Appliquer</button>
        {deadline && <button type="button" className="text-sm underline" onClick={() => search(null)}>Retirer l’heure limite</button>}
        {query && <Link href="/carpool" className="text-sm underline">Toutes les offres</Link>}
      </div>
      <p id="carpool-timezone" className="text-xs text-[var(--text-muted)]">Heure locale · {zone}. Les trajets sans durée estimée restent visibles quand ce champ est vide.</p>
      {error && <p role="alert" className="text-sm">{error}</p>}
      {ambiguous.length > 1 && (
        <fieldset className="text-sm">
          <legend>Cette heure se produit deux fois. Choisis le décalage horaire.</legend>
          {ambiguous.map(date => (
            <button type="button" key={date.toISOString()} className="mr-3 underline" onClick={() => search(date)}>
              {date.toLocaleTimeString('fr-FR', { timeZoneName: 'shortOffset', hour: '2-digit', minute: '2-digit' })}
            </button>
          ))}
        </fieldset>
      )}
    </form>
  )
}
