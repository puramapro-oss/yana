import { MessageSquare, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { Detail } from '../types'

export default function CarpoolTripDetails({ carpool, driver, is_driver }: Pick<Detail, 'carpool' | 'driver' | 'is_driver'>) {
  return (
    <>
      {/* Driver card */}
      {driver && !is_driver && (
        <div className="glass-card-static mb-6 flex items-center gap-4 p-5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] text-sm font-bold text-white"
            aria-hidden
          >
            {driver.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--text-primary)]">{driver.full_name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {driver.kyc_approved ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Vérifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <ShieldAlert className="h-3 w-3" />
                  En attente
                </span>
              )}
              {driver.trust_score != null && (
                <span>Trust {driver.trust_score}/100</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trip attributes */}
      <ul className="mb-6 grid gap-2 sm:grid-cols-3">
        <AttrBadge active={carpool.women_only} emoji="🌸" label="Femmes uniquement" />
        <AttrBadge active={carpool.silent_ride} emoji="🧘" label="Trajet silencieux" />
        <AttrBadge active={carpool.pets_allowed} emoji="🐶" label="Animaux OK" />
      </ul>

      {carpool.description && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <MessageSquare className="h-3 w-3" />
            Message du conducteur
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {carpool.description}
          </p>
        </div>
      )}

    </>
  )
}

function AttrBadge({ active, emoji, label }: { active: boolean; emoji: string; label: string }) {
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
        active
          ? 'border-[var(--cyan)]/40 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-muted)]'
      }`}
    >
      <span className="text-base" aria-hidden>
        {emoji}
      </span>
      <span>{label}</span>
      {!active && <span className="ml-auto opacity-60">—</span>}
    </li>
  )
}
