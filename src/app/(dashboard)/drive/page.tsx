'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Play, Pause, Square } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useVehicle } from '@/hooks/useVehicle'
import { useTrip } from '@/hooks/useTrip'
import type { TripScoreResult } from '@/types'
import {
  NoVehicleState, VehicleSelector, SpeedGauge, Stat, ScoreCard, formatKm, formatDuration,
} from './components'

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
    if (!selectedVehicleId && primary) queueMicrotask(() => setSelectedVehicleId(primary.id))
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
