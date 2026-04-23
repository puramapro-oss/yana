// lib/dual-reward.ts — Split CA covoiturage (80/15/5) + Graines bilatérales.
// Règle invariante KARMA-BRIEF §9 + CLAUDE.md §35 : sur chaque trajet réalisé,
// passager paie le prix plein, puis :
//   80% → driver (wallet € réels, retrait IBAN dès 5€ — §CLAUDE.md)
//   15% → platform fee SASU (pool 'sasu_purama')
//    5% → eco pool (pool 'eco_trees' → finance plantations Tree-Nation)
//
// En plus de l'€ split, les DEUX users gagnent 50 Graines (pas €). Les Graines
// sont les récompenses communautaires non-€ (MLC ESS, voir §26 CLAUDE.md).
//
// Pure function — testable, pas d'accès DB, pas de side-effects.

export const DRIVER_SHARE = 0.80
export const PLATFORM_SHARE = 0.15
export const ECO_POOL_SHARE = 0.05
export const SEEDS_PER_SIDE = 50

export interface DualRewardSplit {
  total_cents: number
  payout_driver_cents: number
  payout_platform_cents: number
  payout_eco_pool_cents: number
  payout_passenger_cents: number        // 0 en scheme MVP (passager récompensé en Graines)
  seeds_for_driver: number
  seeds_for_passenger: number
}

export function calculateDualReward(totalPriceCents: number): DualRewardSplit {
  if (totalPriceCents <= 0) {
    return {
      total_cents: 0,
      payout_driver_cents: 0,
      payout_platform_cents: 0,
      payout_eco_pool_cents: 0,
      payout_passenger_cents: 0,
      seeds_for_driver: SEEDS_PER_SIDE,
      seeds_for_passenger: SEEDS_PER_SIDE,
    }
  }

  // Arrondir driver puis éco, ré-équilibrer platform pour que la somme soit
  // exactement totalPriceCents (aucun centime perdu ni créé).
  const driver = Math.floor(totalPriceCents * DRIVER_SHARE)
  const ecoPool = Math.round(totalPriceCents * ECO_POOL_SHARE)
  const platform = totalPriceCents - driver - ecoPool

  return {
    total_cents: totalPriceCents,
    payout_driver_cents: driver,
    payout_platform_cents: platform,
    payout_eco_pool_cents: ecoPool,
    payout_passenger_cents: 0,
    seeds_for_driver: SEEDS_PER_SIDE,
    seeds_for_passenger: SEEDS_PER_SIDE,
  }
}

/** Application des multiplicateurs de plan sur les Graines (pas sur l'€). */
export function applyPlanMultiplierToSeeds(baseSeeds: number, planMultiplier: number): number {
  return Math.floor(baseSeeds * Math.max(1, planMultiplier))
}
