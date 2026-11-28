/** Agrégats de mesures. Aucune nouvelle coordonnée n'est nécessaire pour le bilan. */
export interface TripCoverage {
  accepted_fixes: number
  observed_seconds: number
}

export interface CoverageReceipt extends TripCoverage {
  received_at: string
  distance_m: number
}

export function hasTripCoverage(
  coverage: TripCoverage | null | undefined,
  durationSec: number,
  elapsedSec: number,
  distanceKm: number,
): coverage is TripCoverage {
  if (!coverage || !Number.isFinite(elapsedSec) || durationSec < 60 || distanceKm <= 0) return false
  const { accepted_fixes: fixes, observed_seconds: observed } = coverage
  return Number.isSafeInteger(fixes) && Number.isSafeInteger(observed)
    && observed >= 60 && observed >= durationSec * 0.8 && observed <= durationSec
    && fixes >= 2 && observed <= (fixes - 1) * 15
    && durationSec <= elapsedSec + 5 && distanceKm * 1000 <= durationSec * 90
}

/**
 * Seules les portions prises entre deux reçus distincts horodatés par le serveur
 * sont éligibles aux Graines communautaires. Les coupures restent neutres.
 */
export function observedRewardKm(
  receipts: readonly CoverageReceipt[], total: TripCoverage, distanceKm: number, durationSec: number,
): number {
  let metres = 0
  let seconds = 0
  let previous: CoverageReceipt | undefined
  for (const current of receipts) {
    if (current.accepted_fixes > total.accepted_fixes || current.observed_seconds > total.observed_seconds
      || current.distance_m > Math.ceil(distanceKm * 1000)) return 0
    if (previous) {
      const wall = (Date.parse(current.received_at) - Date.parse(previous.received_at)) / 1000
      const observed = current.observed_seconds - previous.observed_seconds
      const fixes = current.accepted_fixes - previous.accepted_fixes
      const distance = current.distance_m - previous.distance_m
      if (observed < 0 || fixes < 0 || distance < 0 || !Number.isFinite(wall) || wall <= 0) return 0
      if (wall <= 100 && observed >= 1 && observed <= wall + 5 && observed >= wall * 0.7
        && observed <= fixes * 15 && distance <= observed * 90) {
        metres += distance
        seconds += observed
      }
    }
    previous = current
  }
  return seconds >= durationSec * 0.6 ? Math.min(distanceKm, metres / 1000) : 0
}
