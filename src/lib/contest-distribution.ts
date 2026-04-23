// Distribution des récompenses concours hebdo + tirage mensuel
// CLAUDE.md §CONCOURS :
//   Hebdo : 6% de pool_balances.reward_users, 10 gagnants
//           1er=2% · 2ème=1% · 3ème=0.7% · 4ème=0.5% · 5ème=0.4% · 6ème=0.3% · 7-10ème=1.1% (total)
//   Mensuel : 4% de pool_balances.reward_users, 10 gagnants
//             1er=1.2% · 2ème=0.8% · 3ème=0.6% · 4ème=0.4% · 5-10ème=1% (total)
//
// Toutes les valeurs sont dérivées du pool brut 100% (6% ou 4% du reward_users)
// pour éviter toute dérive d'arrondi.

const WEEKLY_RAW_RATIOS = [2, 1, 0.7, 0.5, 0.4, 0.3, 0.275, 0.275, 0.275, 0.275]
const MONTHLY_RAW_RATIOS = [1.2, 0.8, 0.6, 0.4, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]

export const WEEKLY_POOL_PCT = 0.06
export const MONTHLY_POOL_PCT = 0.04

function distributePool(totalPoolCents: number, rawRatios: number[], rawPct: number): number[] {
  // rawRatios sums to rawPct × 100 (ex. 6). On redistribue exactement le total
  // en fractions fractionnelles du pool et on arrondit par floor, puis on corrige
  // le dernier slot pour absorber le reste (dust).
  const rawSum = rawRatios.reduce((a, b) => a + b, 0)
  // Sanity : rawSum doit être ~ rawPct*100 (ex. 6). Sinon on normalise malgré tout.
  const tolerance = 0.01
  const normalizer = Math.abs(rawSum - rawPct * 100) < tolerance ? rawPct * 100 : rawSum

  const fractions = rawRatios.map((r) => r / normalizer)
  const amounts = fractions.map((f) => Math.floor(totalPoolCents * f))
  const assigned = amounts.reduce((a, b) => a + b, 0)
  const dust = totalPoolCents - assigned
  if (dust > 0 && amounts.length > 0) {
    amounts[0] = amounts[0] + dust
  }
  return amounts
}

export function computeWeeklyPool(rewardUsersPoolCents: number): {
  totalPoolCents: number
  distribution: number[]
} {
  const totalPoolCents = Math.floor(rewardUsersPoolCents * WEEKLY_POOL_PCT)
  return {
    totalPoolCents,
    distribution: distributePool(totalPoolCents, WEEKLY_RAW_RATIOS, 6),
  }
}

export function computeMonthlyPool(rewardUsersPoolCents: number): {
  totalPoolCents: number
  distribution: number[]
} {
  const totalPoolCents = Math.floor(rewardUsersPoolCents * MONTHLY_POOL_PCT)
  return {
    totalPoolCents,
    distribution: distributePool(totalPoolCents, MONTHLY_RAW_RATIOS, 4),
  }
}

// Tirage aléatoire sans remise de N éléments depuis un tableau.
// Utilise crypto.getRandomValues pour une distribution de qualité cryptographique
// (meilleur que Math.random côté Node 18+). Fallback Math.random si indisponible.
export function pickRandomWinners<T>(pool: T[], count: number): T[] {
  if (pool.length <= count) return [...pool]
  const copy = [...pool]
  const winners: T[] = []

  const getRandomFloat = (): number => {
    try {
      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      return arr[0] / 0xffffffff
    } catch {
      return Math.random()
    }
  }

  while (winners.length < count && copy.length > 0) {
    const idx = Math.floor(getRandomFloat() * copy.length)
    winners.push(copy.splice(idx, 1)[0])
  }
  return winners
}
