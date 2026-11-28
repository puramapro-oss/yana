import Link from 'next/link'
import { fallbackSearchHref, isFrasneConnection } from '@/lib/carpool-fallback'
import type { Carpool, CarpoolBooking } from '@/types'

export default function CarpoolFallback({
  carpool,
  booking,
}: {
  carpool: Carpool
  booking: CarpoolBooking | null
}) {
  const seats = booking?.seats ?? 1

  return (
    <section aria-labelledby="fallback-heading" className="glass-card-static mb-6 p-5">
      <h2 id="fallback-heading" className="font-semibold text-[var(--text-primary)]">
        {carpool.status === 'cancelled' ? 'Ce trajet est annulé' : 'Cette réservation est annulée'}
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Recherche {seats === 1 ? 'une place' : `${seats} places`} de {carpool.from_city} à {carpool.to_city}.
      </p>
      <Link href={fallbackSearchHref(carpool, seats)} className="mt-3 inline-flex rounded-full bg-[var(--cyan)] px-4 py-2 font-semibold text-slate-950">
        Chercher un autre covoiturage
      </Link>
      {isFrasneConnection(carpool.from_city, carpool.to_city) && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          <a
            href="https://www.viamobigo.fr/fr/itineraires/4/TripPlanner/index"
            referrerPolicy="no-referrer"
            className="underline underline-offset-2"
          >
            Vérifier les bus et trains sur Mobigo
          </a>
        </p>
      )}
    </section>
  )
}
