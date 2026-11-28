import Link from 'next/link'
import { ChevronRight, MapPin, Users } from 'lucide-react'
import { formatDateTime, formatPrice } from '@/lib/utils'
import { estimatedArrival, type SearchableCarpool } from '@/lib/carpool-arrival'

export default function CarpoolCard({ carpool, asDriver }: { carpool: SearchableCarpool; asDriver?: boolean }) {
  const arrival = estimatedArrival(carpool)
  return (
    <Link
      href={`/carpool/${carpool.id}`}
      data-testid="carpool-card"
      className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-4 transition hover:border-[var(--border-glow)] hover:bg-white/[0.04]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--text-primary)]">
            {carpool.from_city} → {carpool.to_city}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Départ {formatDateTime(carpool.departure_at)} ·{' '}
            {arrival == null ? 'Arrivée non renseignée' : `Arrivée estimée ${formatDateTime(new Date(arrival))}`} ·{' '}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {carpool.seats_remaining}/{carpool.seats_total}
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)] tabular-nums">
            {formatPrice(carpool.price_per_seat_cents)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">/ place</p>
        </div>
        {asDriver && carpool.status === 'completed' && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Terminé
          </span>
        )}
        {asDriver && carpool.status === 'full' && (
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            Complet
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
