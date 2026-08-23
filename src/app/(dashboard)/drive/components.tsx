import Link from 'next/link'
import { Car, AlertTriangle, Leaf, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { TripScoreResult, Vehicle } from '@/types'
import { VEHICLE_TYPES } from '@/lib/constants'

export function NoVehicleState() {
  return (
    <div className="glass-card-static flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cyan)]/10 text-[var(--cyan)]">
        <Car className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          Ajoute un véhicule d&apos;abord
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          YANA a besoin de connaître ton véhicule pour calculer ton CO₂ et ton score éco.
        </p>
      </div>
      <Link
        href="/vehicles"
        className="rounded-full bg-[var(--cyan)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/20 transition hover:brightness-110"
      >
        Ajouter un véhicule
      </Link>
    </div>
  )
}

export function VehicleSelector({
  vehicles,
  selected,
  onSelect,
}: {
  vehicles: Vehicle[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  if (vehicles.length === 1) {
    const v = vehicles[0]!
    return (
      <div className="glass-card-static flex items-center gap-3 p-3">
        <span className="text-2xl" aria-hidden>
          {VEHICLE_TYPES.find((t) => t.id === v.vehicle_type)?.icon ?? '🚗'}
        </span>
        <p className="text-sm text-[var(--text-secondary)]">
          Trajet sur{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            {labelOf(v)}
          </span>
        </p>
      </div>
    )
  }
  return (
    <div className="glass-card-static p-3">
      <label htmlFor="vehicle-select" className="text-xs text-[var(--text-muted)]">
        Véhicule de ce trajet
      </label>
      <select
        id="vehicle-select"
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)]"
        data-testid="drive-vehicle-select"
      >
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {labelOf(v)}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SpeedGauge({
  speed,
  active,
  status,
}: {
  speed: number
  active: boolean
  status: string
}) {
  return (
    <div className="glass-card-static relative overflow-hidden p-8">
      {active && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at center, rgba(0,212,255,0.18), transparent 70%)',
          }}
        />
      )}
      <div className="relative flex flex-col items-center">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {status === 'idle' && 'Prêt à partir'}
          {status === 'active' && 'En route'}
          {status === 'paused' && 'En pause'}
          {status === 'ending' && 'Finalisation…'}
        </p>
        <p
          className="mt-2 font-[family-name:var(--font-display)] text-7xl font-bold text-[var(--text-primary)] tabular-nums sm:text-8xl"
          data-testid="drive-speed"
          aria-live="polite"
        >
          {Math.round(speed)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">km/h</p>
        {active && status === 'active' && (
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cyan)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--cyan)]" />
            </span>
            GPS actif
          </div>
        )}
      </div>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-static p-4 text-center">
      <p
        className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums sm:text-2xl"
        data-testid={`drive-stat-${label.toLowerCase()}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  )
}

export function ScoreCard({
  score,
  distanceKm,
  durationSec,
  onClose,
}: {
  score: TripScoreResult
  distanceKm: number
  durationSec: number
  onClose: () => void
}) {
  const badgeLabel = {
    gold: 'Or',
    silver: 'Argent',
    bronze: 'Bronze',
    learner: 'Apprenti',
  }[score.badge]

  const badgeColor = {
    gold: 'from-amber-400 to-yellow-500',
    silver: 'from-slate-300 to-slate-500',
    bronze: 'from-amber-700 to-amber-900',
    learner: 'from-slate-500 to-slate-700',
  }[score.badge]

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${badgeColor} shadow-xl`}
      >
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Score sécurité · {badgeLabel}
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-6xl font-bold text-[var(--text-primary)] tabular-nums">
          {score.safety_score}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Éco</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
            {score.eco_score}/100
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">CO₂</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
            {score.co2_kg.toFixed(2)} kg
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Distance</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
            {distanceKm.toFixed(1)} km
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Durée</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
            {formatDuration(durationSec)}
          </p>
        </div>
      </div>

      {score.seeds_earned > 0 ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-300">
          <Leaf className="h-4 w-4" />
          <p className="text-sm font-semibold">
            +{score.seeds_earned} Graine{score.seeds_earned > 1 ? 's' : ''} gagnée{score.seeds_earned > 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <div className="flex w-full items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-xs text-amber-100">
            Score insuffisant pour gagner des Graines. Respire, allège ton pied, arrive entier 🧘
          </p>
        </div>
      )}

      <Button onClick={onClose} variant="primary" className="w-full">
        Continuer
      </Button>
    </div>
  )
}

export function labelOf(v: Vehicle): string {
  const bm = [v.brand, v.model].filter(Boolean).join(' ').trim()
  if (bm) return bm
  return VEHICLE_TYPES.find((t) => t.id === v.vehicle_type)?.name ?? 'Véhicule'
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}:${s.toString().padStart(2, '0')}`
  const h = Math.floor(m / 60)
  return `${h}h${(m % 60).toString().padStart(2, '0')}`
}
