import { MapPin, Search } from 'lucide-react'

export interface GeoPoint {
  lat: number
  lng: number
  city: string
}

export default function CityPicker({
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
