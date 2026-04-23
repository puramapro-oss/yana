// lib/co2.ts — calcul CO2 par trajet (source de vérité = yana.co2_factors)
// scoring.ts garde un fallback offline ADEME pour les cas où la DB n'est pas
// disponible (tests pures, scoring critique). Ce module-ci privilégie la DB.

import { createServiceClient } from '@/lib/supabase'
import { co2FactorForFuel } from '@/lib/scoring'
import type { FuelType, VehicleType } from '@/types'

interface Co2FactorRow {
  vehicle_type: string
  fuel_type: string
  kg_co2_per_km: number
  source: string
}

/**
 * Récupère le facteur CO2 en kg/km depuis la DB.
 * Fallback sur le tableau offline `co2FactorForFuel` si la DB ne répond pas
 * ou si la combinaison (vehicle_type, fuel_type) n'existe pas.
 */
export async function getCo2Factor(
  vehicleType: VehicleType,
  fuelType: FuelType | null,
): Promise<{ kg_per_km: number; source: string }> {
  const fuel = fuelType ?? 'petrol'
  try {
    const admin = createServiceClient()
    const { data } = await admin
      .from('co2_factors')
      .select('vehicle_type, fuel_type, kg_co2_per_km, source')
      .eq('vehicle_type', vehicleType)
      .eq('fuel_type', fuel)
      .maybeSingle<Co2FactorRow>()
    if (data) {
      return { kg_per_km: Number(data.kg_co2_per_km), source: data.source }
    }
  } catch {
    // fall through
  }
  return { kg_per_km: co2FactorForFuel(fuel), source: 'fallback scoring.ts ADEME 2026' }
}

export async function calculateTripCo2Db(
  vehicleType: VehicleType,
  fuelType: FuelType | null,
  distanceKm: number,
): Promise<{ co2_kg: number; factor_kg_per_km: number; source: string }> {
  const { kg_per_km, source } = await getCo2Factor(vehicleType, fuelType)
  const co2 = Math.max(0, distanceKm) * kg_per_km
  return {
    co2_kg: Math.round(co2 * 1000) / 1000,
    factor_kg_per_km: kg_per_km,
    source,
  }
}

/**
 * Seuil CO2 évité au-delà duquel un arbre est planté automatiquement.
 * 10 kg = ordre de grandeur ~60km voiture essence. Pattern CRON quotidien :
 * si user.co2_offset_total_kg >= floor(trees_planted + 1) × 10  → planter +1.
 * 1 arbre absorbe ~25 kg CO2/an (estimation Reforest'Action 2026), donc
 * au rythme 1 arbre / 10kg "évités" on surcompense largement — cohérent
 * avec la promesse YANA.
 */
export const CO2_TO_TREE_KG = 10
