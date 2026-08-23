import type { Preference, PrefType, Frequency } from '../types'
import { TYPE_LABELS, DAYS } from '../types'

interface NotificationPrefProps {
  pref: Preference
  onPatch: (updated: Preference) => void
  onToggleDay: (pref: Preference, dayIdx: number) => void
}

export default function NotificationPref({ pref: p, onPatch, onToggleDay }: NotificationPrefProps) {
  const meta = TYPE_LABELS[p.type]
  const paused = p.paused_until && new Date(p.paused_until) > new Date()

  return (
    <article
      key={p.type}
      data-testid={`pref-${p.type}`}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{meta.label}</h2>
          <p className="mt-0.5 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            {meta.desc}
          </p>
        </div>
        <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={p.enabled}
            onChange={(e) => onPatch({ ...p, enabled: e.target.checked })}
            className="peer sr-only"
            aria-label={`Activer ${meta.label}`}
          />
          <span className="absolute inset-0 rounded-full bg-[color-mix(in_oklab,var(--foreground)_20%,transparent)] transition peer-checked:bg-[var(--accent-primary)]" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </label>
      </header>

      {p.enabled && !paused ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
              Jours
            </label>
            <div className="mt-2 flex gap-1.5">
              {DAYS.map((d) => {
                const active = p.days_of_week.includes(d.idx)
                return (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => onToggleDay(p, d.idx)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] hover:bg-[color-mix(in_oklab,var(--surface-elevated)_80%,var(--foreground))]'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
              Fréquence
            </label>
            <div className="mt-2 flex gap-2">
              {(['low', 'normal', 'high'] as Frequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onPatch({ ...p, frequency: f })}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    p.frequency === f
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] hover:bg-[color-mix(in_oklab,var(--surface-elevated)_80%,var(--foreground))]'
                  }`}
                >
                  {f === 'low' ? 'Basse' : f === 'normal' ? 'Normale' : 'Haute'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
              Plage horaire (UTC)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={p.hour_start}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0))
                  onPatch({ ...p, hour_start: v })
                }}
                className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm"
                aria-label="Heure de début"
              />
              <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">→</span>
              <input
                type="number"
                min={0}
                max={23}
                value={p.hour_end}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0))
                  onPatch({ ...p, hour_end: v })
                }}
                className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm"
                aria-label="Heure de fin"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
              Pause jusqu&apos;à
            </label>
            <input
              type="date"
              value={p.paused_until ? p.paused_until.slice(0, 10) : ''}
              onChange={(e) => {
                const v = e.target.value
                onPatch({
                  ...p,
                  paused_until: v ? new Date(v + 'T23:59:59Z').toISOString() : null,
                })
              }}
              className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      ) : paused ? (
        <p className="mt-3 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          En pause jusqu&apos;au {new Date(p.paused_until!).toLocaleDateString('fr-FR')}.{' '}
          <button
            type="button"
            onClick={() => onPatch({ ...p, paused_until: null })}
            className="underline hover:text-[var(--foreground)]"
          >
            Lever la pause
          </button>
        </p>
      ) : null}
    </article>
  )
}
