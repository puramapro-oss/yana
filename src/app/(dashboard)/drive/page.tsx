'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Play, Pause, Square, Car, AlertTriangle, Leaf, Sparkles } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useVehicle } from '@/hooks/useVehicle'
import { useTrip } from '@/hooks/useTrip'
import type { TripScoreResult, Vehicle } from '@/types'
import { VEHICLE_TYPES } from '@/lib/constants'

export default function DrivePage() {
  const { vehicles, primary, loading: loadingVehicles } = useVehicle()
  const { state, start, pause, resume, stop, cancel, isActive } = useTrip()
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [scoreResult, setScoreResult] = useState<TripScoreResult | null>(null)
  const [showScore, setShowScore] = useState(false)
  const [scoreDistanceKm, setScoreDistanceKm] = useState(0)
  const [scoreDurationSec, setScoreDurationSec] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!selectedVehicleId && primary) setSelectedVehicleId(primary.id)
  }, [primary, selectedVehicleId])

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state.error])

  async function handleStart() {
    if (!selectedVehicleId) {
      toast.error('Sélectionne un véhicule.')
      return
    }
    setBusy(true)
    const { error } = await start({ vehicle_id: selectedVehicleId, trip_mode: 'solo' })
    setBusy(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Trajet démarré. Conduis en conscience 🧘')
  }

  async function handleStop() {
    if (busy) return
    setBusy(true)
    const distanceKm = state.distance_m / 1000
    const durationSec = state.duration_sec
    const { score, error } = await stop()
    setBusy(false)
    if (error || !score) {
      toast.error(error ?? 'Trajet clôturé, score indisponible.')
      return
    }
    setScoreResult(score)
    setScoreDistanceKm(distanceKm)
    setScoreDurationSec(durationSec)
    setShowScore(true)
  }

  async function handleCancel() {
    if (!confirm('Annuler ce trajet ? Aucun score ne sera enregistré.')) return
    setBusy(true)
    await cancel()
    setBusy(false)
    toast('Trajet annulé.')
  }

  const status = state.status

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          SAFE DRIVE
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Ta conduite, ton score, tes Graines. Respire avant de démarrer 🧘
        </p>
      </header>

      {loadingVehicles && (
        <div className="glass-card-static flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--cyan)] border-t-transparent" />
        </div>
      )}

      {!loadingVehicles && vehicles.length === 0 && (
        <NoVehicleState />
      )}

      {!loadingVehicles && vehicles.length > 0 && (
        <>
          {!isActive && (
            <VehicleSelector
              vehicles={vehicles}
              selected={selectedVehicleId}
              onSelect={setSelectedVehicleId}
            />
          )}

          <SpeedGauge
            speed={state.current_speed_kmh}
            active={isActive}
            status={status}
          />

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Distance" value={formatKm(state.distance_m / 1000)} />
            <Stat label="Durée" value={formatDuration(state.duration_sec)} />
            <Stat label="Events" value={String(state.events_count)} />
          </div>

          <div className="mt-auto flex flex-col gap-3 pb-6">
            {status === 'idle' && (
              <Button
                data-testid="drive-start"
                onClick={handleStart}
                disabled={!selectedVehicleId || busy}
                loading={busy}
                className="h-16 w-full text-lg"
                icon={<Play className="h-5 w-5" />}
              >
                Démarrer le trajet
              </Button>
            )}

            {status === 'active' && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  data-testid="drive-pause"
                  onClick={pause}
                  variant="secondary"
                  className="h-16 text-lg"
                  icon={<Pause className="h-5 w-5" />}
                >
                  Pause
                </Button>
                <Button
                  data-testid="drive-stop"
                  onClick={handleStop}
                  disabled={busy}
                  loading={busy}
                  className="h-16 bg-gradient-to-r from-[var(--pink)] to-[var(--orange)] text-white hover:opacity-90"
                  icon={<Square className="h-5 w-5" />}
                >
                  Arrêter
                </Button>
              </div>
            )}

            {status === 'paused' && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  data-testid="drive-resume"
                  onClick={resume}
                  className="h-16 text-lg"
                  icon={<Play className="h-5 w-5" />}
                >
                  Reprendre
                </Button>
                <Button
                  data-testid="drive-stop-paused"
                  onClick={handleStop}
                  disabled={busy}
                  loading={busy}
                  variant="secondary"
                  className="h-16 text-lg"
                  icon={<Square className="h-5 w-5" />}
                >
                  Terminer
                </Button>
              </div>
            )}

            {isActive && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text-secondary)] disabled:opacity-50"
              >
                Annuler sans sauvegarder
              </button>
            )}
          </div>
        </>
      )}

      <Modal
        open={showScore}
        onClose={() => setShowScore(false)}
        title="Trajet terminé"
        className="max-w-md"
      >
        {scoreResult && (
          <ScoreCard
            score={scoreResult}
            distanceKm={scoreDistanceKm}
            durationSec={scoreDurationSec}
            onClose={() => setShowScore(false)}
          />
        )}
      </Modal>
    </div>
  )
}

function NoVehicleState() {
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

function VehicleSelector({
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

function SpeedGauge({
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

function Stat({ label, value }: { label: string; value: string }) {
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

function ScoreCard({
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

function labelOf(v: Vehicle): string {
  const bm = [v.brand, v.model].filter(Boolean).join(' ').trim()
  if (bm) return bm
  return VEHICLE_TYPES.find((t) => t.id === v.vehicle_type)?.name ?? 'Véhicule'
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}:${s.toString().padStart(2, '0')}`
  const h = Math.floor(m / 60)
  return `${h}h${(m % 60).toString().padStart(2, '0')}`
}
