'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Car, Bike, Zap, Plus, Star, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useVehicle, type CreateVehicleInput } from '@/hooks/useVehicle'
import { VEHICLE_TYPES, FUEL_TYPES } from '@/lib/constants'
import type { FuelType, Vehicle, VehicleType } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()

export default function VehiclesPage() {
  const { vehicles, loading, error, create, remove, setPrimary, refetch } = useVehicle()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateVehicleInput>({
    vehicle_type: 'car',
    brand: '',
    model: '',
    year: CURRENT_YEAR,
    fuel_type: 'petrol',
  })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const allowedFuels: readonly string[] =
    VEHICLE_TYPES.find((v) => v.id === form.vehicle_type)?.allowedFuels ?? []

  function resetForm() {
    setForm({
      vehicle_type: 'car',
      brand: '',
      model: '',
      year: CURRENT_YEAR,
      fuel_type: 'petrol',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const { error: errMsg } = await create({
      vehicle_type: form.vehicle_type,
      brand: form.brand?.trim() || null,
      model: form.model?.trim() || null,
      year: form.year ?? null,
      fuel_type: form.fuel_type,
    })
    setSubmitting(false)
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    toast.success('Véhicule ajouté 🚗')
    resetForm()
    setModalOpen(false)
  }

  async function handleDelete(v: Vehicle) {
    const label = vehicleLabel(v)
    if (!confirm(`Supprimer ${label} ? Les trajets liés seront conservés.`)) return
    setDeletingId(v.id)
    const { error: errMsg } = await remove(v.id)
    setDeletingId(null)
    if (errMsg) toast.error(errMsg)
    else toast.success(`${label} supprimé.`)
  }

  async function handleSetPrimary(v: Vehicle) {
    if (v.is_primary) return
    const { error: errMsg } = await setPrimary(v.id)
    if (errMsg) toast.error(errMsg)
    else toast.success(`${vehicleLabel(v)} défini comme principal.`)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Tes véhicules 🚗
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Ajoute chaque véhicule que tu conduis. YANA adapte le scoring carbone au type d’énergie.
          </p>
        </div>
        <Button
          data-testid="vehicles-add-btn"
          onClick={() => setModalOpen(true)}
          variant="primary"
          size="md"
          icon={<Plus className="h-4 w-4" />}
        >
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </header>

      {loading && <VehicleSkeletonGrid />}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}{' '}
          <button onClick={refetch} className="underline hover:no-underline">
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && vehicles.length === 0 && (
        <EmptyState
          icon="🚗"
          title="Pas encore de véhicule"
          description="Ajoute ton premier véhicule pour démarrer ton suivi SAFE DRIVE et compenser ton CO₂."
          action={
            <Button onClick={() => setModalOpen(true)} variant="primary" icon={<Plus className="h-4 w-4" />}>
              Ajouter un véhicule
            </Button>
          }
        />
      )}

      {!loading && !error && vehicles.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="vehicles-list">
          {vehicles.map((v) => (
            <li
              key={v.id}
              className="glass-card-static flex items-start justify-between gap-3 p-4"
              data-testid="vehicle-card"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <VehicleIcon type={v.vehicle_type} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-primary)]">
                    {vehicleLabel(v)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {FUEL_TYPES.find((f) => f.id === v.fuel_type)?.name ?? v.fuel_type ?? '—'}
                    {v.year ? ` · ${v.year}` : ''}
                  </p>
                  {v.is_primary && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-300" />
                      Principal
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!v.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(v)}
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-white/5"
                    aria-label={`Définir ${vehicleLabel(v)} comme principal`}
                  >
                    Principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(v)}
                  disabled={deletingId === v.id}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  aria-label={`Supprimer ${vehicleLabel(v)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un véhicule">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[var(--text-secondary)]">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map((t) => {
                const active = form.vehicle_type === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      const nextAllowed = t.allowedFuels as readonly string[]
                      setForm((f) => ({
                        ...f,
                        vehicle_type: t.id as VehicleType,
                        fuel_type: (nextAllowed.includes(f.fuel_type) ? f.fuel_type : (t.allowedFuels[0] as FuelType)),
                      }))
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition ${
                      active
                        ? 'border-[var(--cyan)]/60 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
                        : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--border-glow)]'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-2xl" aria-hidden>
                      {t.icon}
                    </span>
                    <span>{t.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            id="veh-brand"
            label="Marque (optionnel)"
            placeholder="Ex : Renault, BMW, Tesla…"
            value={form.brand ?? ''}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            maxLength={50}
          />
          <Input
            id="veh-model"
            label="Modèle (optionnel)"
            placeholder="Ex : Clio, R1250, Model 3…"
            value={form.model ?? ''}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            maxLength={80}
          />
          <Input
            id="veh-year"
            label="Année"
            type="number"
            min={1970}
            max={2030}
            value={form.year ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value)
              setForm({ ...form, year: Number.isFinite(n) ? n : null })
            }}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[var(--text-secondary)]">Énergie</label>
            <div className="grid grid-cols-3 gap-2">
              {FUEL_TYPES.filter((f) => allowedFuels.includes(f.id)).map((f) => {
                const active = form.fuel_type === f.id
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setForm({ ...form, fuel_type: f.id as FuelType })}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs transition ${
                      active
                        ? 'border-[var(--cyan)]/60 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
                        : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--border-glow)]'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-xl" aria-hidden>
                      {f.icon}
                    </span>
                    <span>{f.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={submitting} data-testid="vehicles-submit">
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function vehicleLabel(v: Vehicle): string {
  const brandModel = [v.brand, v.model].filter(Boolean).join(' ').trim()
  if (brandModel) return brandModel
  return VEHICLE_TYPES.find((t) => t.id === v.vehicle_type)?.name ?? 'Véhicule'
}

function VehicleIcon({ type }: { type: VehicleType }) {
  const Icon = type === 'moto' || type === 'ev_moto' ? Bike : type === 'ev_car' || type === 'hybrid' ? Zap : Car
  return (
    <div
      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--cyan)]/10 text-[var(--cyan)]"
      aria-hidden
    >
      <Icon className="h-5 w-5" />
    </div>
  )
}

function VehicleSkeletonGrid() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="glass-card-static p-4">
          <div className="flex items-start gap-3">
            <div className="skeleton h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
