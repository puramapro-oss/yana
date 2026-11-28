'use client'

import { isFrasneConnection } from '@/lib/carpool-fallback'
import { carpoolMapLinks } from '@/lib/carpool-directions'
import type { Carpool, CarpoolBooking } from '@/types'

export default function CarpoolDirections({ carpool, booking, isDriver }: {
  carpool: Carpool
  booking: CarpoolBooking | null
  isDriver: boolean
}) {
  const { destinationCity, meetingDirections } = carpoolMapLinks(carpool, booking?.status, isDriver)
  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
  return (
    <details className="glass-card-static mb-6 p-4">
      <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">Préparer le trajet</summary>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        À l’arrêt, vérifie le lieu et choisis ton mode de déplacement dans Google Maps.
        Le bouton d’arrivée recherche la ville de {carpool.to_city}.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[var(--text-primary)]">
        {meetingDirections && (
          <button type="button" className="underline" onClick={() => open(meetingDirections)}>
            Itinéraire vers le rendez-vous dans Maps
          </button>
        )}
        <button type="button" className="underline" onClick={() => open(destinationCity)}>
          Voir la ville d’arrivée dans Maps
        </button>
        {isFrasneConnection(carpool.from_city, carpool.to_city) && (
          <button type="button" className="underline" onClick={() => open('https://vigilance.meteofrance.fr/fr/doubs')}>
            Vigilance Météo-France dans le Doubs
          </button>
        )}
      </div>
    </details>
  )
}
