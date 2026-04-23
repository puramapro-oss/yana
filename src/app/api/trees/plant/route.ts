import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { plantTree } from '@/lib/tree-nation'
import { CO2_TO_TREE_KG } from '@/lib/co2'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  trip_id: z.string().uuid().nullable().optional(),
})

interface ProfileRow {
  id: string
  co2_offset_total_kg: number | string
  trees_planted_total: number
}

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, co2_offset_total_kg, trees_planted_total')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const co2Kg = Number(profile.co2_offset_total_kg ?? 0)
  const treesPlanted = profile.trees_planted_total ?? 0
  const treesEligible = Math.floor(co2Kg / CO2_TO_TREE_KG)
  const treesAvailable = treesEligible - treesPlanted

  if (treesAvailable < 1) {
    const kgToNext = Math.max(
      0,
      (treesPlanted + 1) * CO2_TO_TREE_KG - co2Kg,
    )
    return NextResponse.json(
      {
        error: `Il te faut compenser ${kgToNext.toFixed(1)} kg CO₂ de plus pour débloquer ton prochain arbre.`,
        kg_to_next_tree: kgToNext,
        co2_offset_total_kg: co2Kg,
        trees_planted_total: treesPlanted,
      },
      { status: 400 },
    )
  }

  const plantResult = await plantTree({
    user_id: profile.id,
    trip_id: parsed.data.trip_id ?? null,
    tree_count: 1,
    co2_offset_kg: CO2_TO_TREE_KG,
    note: 'Claim utilisateur (seuil 10kg CO2 atteint)',
  })

  const { data: tree, error } = await admin
    .from('trees_planted')
    .insert({
      user_id: profile.id,
      trip_id: parsed.data.trip_id ?? null,
      provider: plantResult.provider,
      tree_count: 1,
      co2_offset_kg: CO2_TO_TREE_KG,
      cost_cents: 0,
      certificate_url: plantResult.certificate_url,
      ots_proof: plantResult.ots_proof,
    })
    .select('*')
    .single()

  if (error || !tree) {
    return NextResponse.json(
      { error: 'Plantation impossible. Réessaie dans quelques secondes.' },
      { status: 500 },
    )
  }

  await admin
    .from('profiles')
    .update({ trees_planted_total: treesPlanted + 1 })
    .eq('id', profile.id)

  return NextResponse.json({
    tree,
    payload_hash: plantResult.payload_hash,
    provider: plantResult.provider,
  })
}
