import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { CO2_TO_TREE_KG } from '@/lib/co2'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 100)))

  const admin = createServiceClient()

  const [{ data: trees, error: treesErr }, { data: profile }] = await Promise.all([
    admin
      .from('trees_planted')
      .select('*')
      .eq('user_id', user.id)
      .order('planted_at', { ascending: false })
      .limit(limit),
    admin
      .from('profiles')
      .select('co2_offset_total_kg, trees_planted_total, total_trips, total_distance_km')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (treesErr) {
    return NextResponse.json(
      { error: 'Impossible de charger ta forêt. Réessaie.' },
      { status: 500 },
    )
  }

  const co2Kg = Number(profile?.co2_offset_total_kg ?? 0)
  const treesPlanted = profile?.trees_planted_total ?? 0
  const treesEligible = Math.floor(co2Kg / CO2_TO_TREE_KG)
  const treesAvailable = Math.max(0, treesEligible - treesPlanted)
  const kgToNext = Math.max(0, (treesPlanted + 1) * CO2_TO_TREE_KG - co2Kg)

  return NextResponse.json({
    trees: trees ?? [],
    stats: {
      co2_offset_total_kg: co2Kg,
      trees_planted_total: treesPlanted,
      trees_available_to_claim: treesAvailable,
      kg_to_next_tree: kgToNext,
      total_trips: profile?.total_trips ?? 0,
      total_distance_km: Number(profile?.total_distance_km ?? 0),
    },
  })
}
