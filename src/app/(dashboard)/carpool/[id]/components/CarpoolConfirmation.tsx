import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface ConfirmationProps {
  departureAt: string
  confirmed: boolean
  otherConfirmed: boolean
  other: 'conducteur' | 'passager'
  disabled: boolean
  busy: boolean
  onConfirm: () => void
}

export default function CarpoolConfirmation({ departureAt, confirmed, otherConfirmed, other, disabled, busy, onConfirm }: ConfirmationProps) {
  const departure = Date.parse(departureAt)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (confirmed || !Number.isFinite(departure) || now >= departure) return
    const delay = Math.min(Math.max(0, departure - Date.now()) + 10, 2_147_483_647)
    const timer = window.setTimeout(() => setNow(Date.now()), delay)
    return () => window.clearTimeout(timer)
  }, [confirmed, departure, now])

  if (confirmed) {
    return <p className="text-xs text-[var(--text-secondary)]">
      {otherConfirmed ? 'Les deux confirmations ont été reçues.' : `Ta confirmation est enregistrée. En attente du ${other}.`}
    </p>
  }
  if (now < departure) {
    return <p className="text-xs text-[var(--text-secondary)]">Confirmation possible après le départ du {formatDateTime(departureAt)}.</p>
  }
  return (
    <div className="space-y-1">
      {otherConfirmed && <p className="text-xs text-[var(--text-secondary)]">Le {other} a confirmé le trajet.</p>}
      <Button type="button" onClick={onConfirm} disabled={disabled} loading={busy} variant="secondary" size="sm" data-testid="carpool-complete">
        Confirmer le trajet effectué
      </Button>
    </div>
  )
}
