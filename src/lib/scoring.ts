// lib/scoring.ts — SAFE DRIVE + GREEN DRIVE scoring (pure functions, testable)
// Règle invariante: entrées immuables, pas d'accès DB, pas d'accès réseau.
// Appelé par /api/trips/end pour finaliser un trajet.

import type { FuelType, TripEventType, TripMode, TripScoreResult } from '@/types'
import { TRIP_EVENT_WEIGHTS } from '@/lib/constants'

// ADEME — Base Carbone v23 (2026) — kg CO2eq par km moyen
// Source: https://base-carbone.ademe.fr (véhicule thermique + fab batterie + mix élec FR)
// P2.2 enrichira via yana.co2_factors (DB) — ici fallback offline.
export const CO2_FACTORS_KG_PER_KM: Record<FuelType, number> = {
  petrol: 0.192,
  diesel: 0.171,
  hybrid: 0.105,
  plugin_hybrid: 0.070,
  electric: 0.053,
  lpg: 0.142,
  none: 0.04, // véhicule musculaire (vélo/skate) estimation amortissement
}

export function co2FactorForFuel(fuel: FuelType | null): number {
  if (!fuel) return CO2_FACTORS_KG_PER_KM.petrol
  return CO2_FACTORS_KG_PER_KM[fuel] ?? CO2_FACTORS_KG_PER_KM.petrol
}

export function calculateCo2Kg(distanceKm: number, fuelType: FuelType | null): number {
  if (distanceKm <= 0) return 0
  const factor = co2FactorForFuel(fuelType)
  return Math.round(distanceKm * factor * 1000) / 1000 // 3 décimales
}

export function safetyBadge(
  score: number,
): 'gold' | 'silver' | 'bronze' | 'learner' {
  if (score >= 90) return 'gold'
  if (score >= 75) return 'silver'
  if (score >= 60) return 'bronze'
  return 'learner'
}

interface ScoringEvent {
  event_type: TripEventType
  severity: number // 1..5
  speed_kmh?: number | null
  speed_limit_kmh?: number | null
}

export interface CalculateTripScoreInput {
  events: ScoringEvent[]
  distance_km: number
  duration_sec: number
  fuel_type: FuelType | null
  trip_mode: TripMode
  passengers_count: number
}

/**
 * Safety score 0-100.
 *  - Base 100
 *  - Chaque event négatif: poids × (severity/3) (severity 3 = poids nominal)
 *  - Speeding: pénalité additionnelle proportionnelle au dépassement
 *  - Events positifs: bonus limité à +15
 *  - Clamp [0, 100]
 */
function computeSafetyScore(
  events: ScoringEvent[],
): {
  score: number
  events_penalty: number
  events_bonus: number
  speeding_penalty: number
} {
  let penalty = 0
  let bonus = 0
  let speedingPenalty = 0

  for (const ev of events) {
    const weight = TRIP_EVENT_WEIGHTS[ev.event_type]
    if (weight == null) continue
    const severityFactor = Math.max(1, Math.min(5, ev.severity)) / 3
    const delta = weight * severityFactor

    if (ev.event_type === 'speeding' && ev.speed_kmh != null && ev.speed_limit_kmh != null) {
      const over = Math.max(0, ev.speed_kmh - ev.speed_limit_kmh)
      // +1 pt pénalité par km/h au-dessus (cap 30)
      speedingPenalty += Math.min(30, over)
      continue
    }

    if (delta < 0) penalty += delta
    else bonus += delta
  }

  // Cap bonus
  bonus = Math.min(15, bonus)

  const raw = 100 + penalty + bonus - speedingPenalty
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  return { score, events_penalty: penalty, events_bonus: bonus, speeding_penalty: speedingPenalty }
}

/**
 * Eco score 0-100.
 *  - Base: 80 si électrique, 60 si hybride, 50 sinon
 *  - +3 par eco_acceleration (cap +20)
 *  - -3 par harsh_accel (cap -30)
 *  - -5 par speeding (conduite agressive = surconso)
 */
function computeEcoScore(events: ScoringEvent[], fuel: FuelType | null): number {
  let base = 50
  if (fuel === 'electric') base = 80
  else if (fuel === 'hybrid' || fuel === 'plugin_hybrid') base = 60
  else if (fuel === 'none') base = 90

  let ecoBonus = 0
  let ecoPenalty = 0

  for (const ev of events) {
    if (ev.event_type === 'eco_acceleration') ecoBonus += 3
    else if (ev.event_type === 'harsh_accel') ecoPenalty += 3
    else if (ev.event_type === 'speeding') ecoPenalty += 5
  }

  ecoBonus = Math.min(20, ecoBonus)
  ecoPenalty = Math.min(30, ecoPenalty)

  return Math.max(0, Math.min(100, base + ecoBonus - ecoPenalty))
}

/**
 * Graines base — le multiplicateur plan (×1, ×5, ×10) est appliqué côté API.
 *  - < 1 km: 0 (pas assez de data)
 *  - Score < 60: 0 (Graines = récompense sécurité)
 *  - Score 60-74: 0.2 Graine/km
 *  - Score 75-89: 0.4 Graine/km
 *  - Score >= 90: 0.6 Graine/km
 *  - Eco >= 70: +25%
 *  - Mode carpool_driver: +1 Graine par passager par 10 km
 */
function computeSeedsEarned(
  distanceKm: number,
  safetyScore: number,
  ecoScore: number,
  tripMode: TripMode,
  passengers: number,
): number {
  if (distanceKm < 1) return 0
  if (safetyScore < 60) return 0

  let perKm = 0.2
  if (safetyScore >= 90) perKm = 0.6
  else if (safetyScore >= 75) perKm = 0.4

  let seeds = distanceKm * perKm
  if (ecoScore >= 70) seeds *= 1.25

  if (tripMode === 'carpool_driver' && passengers > 0) {
    seeds += (distanceKm / 10) * passengers
  }

  return Math.floor(seeds)
}

export function calculateTripScore(input: CalculateTripScoreInput): TripScoreResult {
  const { events, distance_km, fuel_type, trip_mode, passengers_count } = input

  const { score: safety_score, events_penalty, events_bonus, speeding_penalty } = computeSafetyScore(
    events,
  )
  const eco_score = computeEcoScore(events, fuel_type)
  const co2_kg = calculateCo2Kg(distance_km, fuel_type)
  const seeds_earned = computeSeedsEarned(
    distance_km,
    safety_score,
    eco_score,
    trip_mode,
    passengers_count,
  )

  const event_counts: Partial<Record<TripEventType, number>> = {}
  for (const ev of events) {
    event_counts[ev.event_type] = (event_counts[ev.event_type] ?? 0) + 1
  }

  return {
    safety_score,
    eco_score,
    co2_kg,
    seeds_earned,
    badge: safetyBadge(safety_score),
    event_counts,
    breakdown: {
      base: 100,
      events_penalty,
      events_bonus,
      speeding_penalty,
    },
  }
}
