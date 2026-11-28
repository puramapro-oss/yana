'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { Carpool, CarpoolBooking } from '@/types'

interface Props {
  carpool: Carpool
  booking: CarpoolBooking | null
  isDriver: boolean
  onCancelled: () => Promise<void>
}

export default function CancelCarpoolAction({ carpool, booking, isDriver, onCancelled }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (carpool.status !== 'open' && carpool.status !== 'full') return null
  if (!isDriver && booking?.status !== 'pending' && booking?.status !== 'confirmed') return null

  function openConfirmation() {
    if (Date.parse(carpool.departure_at) <= Date.now()) {
      setError('L’heure de départ est passée.')
      return
    }
    setError('')
    setConfirming(true)
  }

  async function cancel() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/carpool/${encodeURIComponent(carpool.id)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: isDriver ? 'trip' : 'booking' }),
      })
      const result = await response.json()
      if (response.ok && result.status === 'cancelled') {
        await onCancelled()
      } else {
        setError(result.error ?? 'Annulation non confirmée.')
      }
    } catch {
      setError('Confirmation indisponible. Actualise le trajet ou réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      {confirming ? (
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="mb-3 text-sm text-[var(--text-primary)]">
            {isDriver ? 'Annuler le trajet et toutes ses réservations ?' : 'Annuler ta réservation et libérer les places ?'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setConfirming(false); setError('') }}>
              {isDriver ? 'Garder le trajet' : 'Garder ma réservation'}
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={cancel}>
              Confirmer l’annulation
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={openConfirmation} className="text-sm text-[var(--text-secondary)] underline">
          {isDriver ? 'Annuler ce trajet' : 'Annuler ma réservation'}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}
