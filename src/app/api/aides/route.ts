import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { Aide } from '@/types'
import {
  isProfilKey,
  isRegionKey,
  parseSituationsCSV,
  type ProfilKey,
  type RegionKey,
  type SituationKey,
} from '@/lib/aides-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FilterInput {
  profil: ProfilKey | null
  situations: SituationKey[]
  region: RegionKey | null
}

function parseFilters(searchParams: URLSearchParams): FilterInput {
  const rawProfil = searchParams.get('profil')
  const rawRegion = searchParams.get('region')
  const rawSituations = searchParams.get('situations')

  return {
    profil: isProfilKey(rawProfil) ? rawProfil : null,
    situations: parseSituationsCSV(rawSituations),
    region: isRegionKey(rawRegion) ? rawRegion : null,
  }
}

// Scoring : une aide matche les filtres si
// - profil_eligible ∅ OU contient le profil user (ou "particulier")
// - region ∅, 'national' OU = region user
// - au moins 1 situation matche (ou aucune situation fournie)
function scoreAide(aide: Aide, filters: FilterInput): { matches: boolean; score: number } {
  let score = 0

  // Profil : soit l'aide accepte tout le monde (profil_eligible vide), soit elle cite ce profil
  if (filters.profil) {
    const accepts =
      aide.profil_eligible.length === 0 ||
      aide.profil_eligible.includes(filters.profil) ||
      aide.profil_eligible.includes('particulier')
    if (!accepts) return { matches: false, score: 0 }
    if (aide.profil_eligible.includes(filters.profil)) score += 10
  }

  // Région : national OK partout, sinon doit matcher
  if (filters.region && aide.region && aide.region !== 'national' && aide.region !== filters.region) {
    return { matches: false, score: 0 }
  }
  if (filters.region && aide.region === filters.region) score += 5

  // Handicap : ne propose que si profil = handicape
  if (aide.handicap_only && filters.profil !== 'handicape') {
    return { matches: false, score: 0 }
  }

  // Situations : si fournies, compter intersections (sinon pas de filtrage)
  if (filters.situations.length > 0) {
    const intersection = aide.situation_eligible.filter((s) =>
      filters.situations.includes(s as SituationKey),
    )
    if (aide.situation_eligible.length > 0 && intersection.length === 0) {
      return { matches: false, score: 0 }
    }
    score += intersection.length * 3
  }

  // Bonus montant (tri secondaire)
  score += Math.min(5, Math.floor((aide.montant_max_eur ?? 0) / 1000))

  return { matches: true, score }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filters = parseFilters(searchParams)

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('aides')
    .select('*')
    .eq('active', true)
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'aides_fetch_failed' }, { status: 500 })
  }

  const aides = (data ?? []) as Aide[]

  // Si aucun filtre → renvoyer tout (listing complet)
  const hasAnyFilter = filters.profil !== null || filters.region !== null || filters.situations.length > 0
  if (!hasAnyFilter) {
    const sorted = aides.sort((a, b) => (b.montant_max_eur ?? 0) - (a.montant_max_eur ?? 0))
    return NextResponse.json({
      aides: sorted,
      filters,
      count: sorted.length,
      totalEur: sorted.reduce((s, a) => s + (a.montant_max_eur ?? 0), 0),
    })
  }

  // Sinon : filtrer + scorer + trier
  const scored = aides
    .map((a) => ({ aide: a, ...scoreAide(a, filters) }))
    .filter((r) => r.matches)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (b.aide.montant_max_eur ?? 0) - (a.aide.montant_max_eur ?? 0)
    })
    .map((r) => r.aide)

  return NextResponse.json({
    aides: scored,
    filters,
    count: scored.length,
    totalEur: scored.reduce((s, a) => s + (a.montant_max_eur ?? 0), 0),
  })
}
