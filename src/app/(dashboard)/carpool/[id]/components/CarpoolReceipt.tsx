import { carpoolReceipt, type ReceiptBooking, type ReceiptSettlement } from '@/lib/carpool-receipt'
import { formatPrice } from '@/lib/utils'

interface ReceiptProps {
  totalCents: number
  booking?: ReceiptBooking
  cancelled?: boolean
  settlement?: ReceiptSettlement
  mySeeds?: number | null
}

export default function CarpoolReceipt({ totalCents, booking, cancelled, settlement, mySeeds }: ReceiptProps) {
  const { kind, amounts } = carpoolReceipt(totalCents, booking, settlement, cancelled)
  const note = {
    estimate: 'La réservation ne déclenche aucun prélèvement.',
    awaiting_funding: 'Financement en attente. Aucun versement en euros déclenché.',
    unverified: 'Répartition financière non vérifiée.',
    recorded: null,
    inactive: null,
  }[kind]

  return (
    <section className="rounded-xl border border-[var(--border)] p-4 text-sm" aria-label="Récapitulatif du prix">
      <div className="flex items-baseline justify-between gap-3 font-semibold">
        <span>{booking ? 'Prix de la réservation' : 'Total pour les places choisies'}</span>
        <span className="tabular-nums">{formatPrice(totalCents)}</span>
      </div>
      {amounts && (
        <>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {kind === 'estimate' ? 'Répartition indicative, frais inclus' : 'Répartition enregistrée à la clôture'}
          </p>
          <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 text-[var(--text-secondary)]">
            <dt>Part conducteur</dt><dd className="text-right">{formatPrice(amounts.payout_driver_cents)}</dd>
            <dt>Frais de plateforme</dt><dd className="text-right">{formatPrice(amounts.payout_platform_cents)}</dd>
            <dt>Fonds écologique</dt><dd className="text-right">{formatPrice(amounts.payout_eco_pool_cents)}</dd>
            {amounts.payout_passenger_cents > 0 && <>
              <dt>Part passager</dt><dd className="text-right">{formatPrice(amounts.payout_passenger_cents)}</dd>
            </>}
          </dl>
        </>
      )}
      {note && <p className="mt-2 text-xs text-[var(--text-secondary)]">{note}</p>}
      {mySeeds != null && (
        <p className="mt-2 text-sm font-medium text-emerald-300">
          Tes points crédités pour ce trajet · {mySeeds} Graines
        </p>
      )}
    </section>
  )
}
