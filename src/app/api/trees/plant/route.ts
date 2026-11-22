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

interface TreePledgeResult {
  error_code: string | null
  tree: Record<string, unknown> | null
  co2_offset_total_kg: number | string
  trees_planted_total: number
}

function notEligible(co2Kg: number, treesPlanted: number) {
  const kgToNext = Math.max(0, (treesPlanted + 1) * CO2_TO_TREE_KG - co2Kg)
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
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, co2_offset_total_kg, trees_planted_total')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  if (profileError) {
    return NextResponse.json({ error: 'Lecture du profil impossible.' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const co2Kg = Number(profile.co2_offset_total_kg ?? 0)
  const treesPlanted = profile.trees_planted_total ?? 0
  if (!Number.isFinite(co2Kg) || co2Kg < 0 || !Number.isInteger(treesPlanted) || treesPlanted < 0) {
    return NextResponse.json({ error: 'Compteurs du profil invalides.' }, { status: 500 })
  }
  const treesEligible = Math.floor(co2Kg / CO2_TO_TREE_KG)
  const treesAvailable = treesEligible - treesPlanted

  if (treesAvailable < 1) {
    return notEligible(co2Kg, treesPlanted)
  }

  const plantResult = await plantTree({
    user_id: profile.id,
    trip_id: parsed.data.trip_id ?? null,
    tree_count: 1,
    co2_offset_kg: CO2_TO_TREE_KG,
    note: 'Claim utilisateur (seuil 10kg CO2 atteint)',
  })

  // plantTree currently prepares an intention/OTS receipt only. A future real
  // provider needs an idempotent outbox before it may consume this credit.
  if (plantResult.provider !== 'manual') {
    return NextResponse.json({ error: 'Fournisseur de plantation non pris en charge.' }, { status: 503 })
  }

  const { data: outcome, error } = await admin
    .rpc('record_manual_tree_pledge', {
      p_user_id: profile.id,
      p_trip_id: parsed.data.trip_id ?? null,
      p_ots_proof: plantResult.ots_proof,
    })
    .single<TreePledgeResult>()

  if (error || !outcome) {
    return NextResponse.json(
      { error: 'Plantation impossible. Réessaie dans quelques secondes.' },
      { status: 500 },
    )
  }

  if (outcome.error_code === 'not_eligible') {
    return notEligible(Number(outcome.co2_offset_total_kg), outcome.trees_planted_total)
  }
  if (outcome.error_code === 'profile_not_found') {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }
  if (outcome.error_code === 'invalid_trip') {
    return NextResponse.json({ error: 'Trajet invalide.' }, { status: 400 })
  }
  if (outcome.error_code === 'reconciliation_required') {
    return NextResponse.json(
      { error: 'Le compteur de ta forêt doit être vérifié avant un nouvel enregistrement.', code: 'reconciliation_required' },
      { status: 409 },
    )
  }
  if (outcome.error_code || !outcome.tree) {
    return NextResponse.json({ error: 'Enregistrement de l’intention impossible.' }, { status: 500 })
  }

  return NextResponse.json({
    tree: outcome.tree,
    payload_hash: plantResult.payload_hash,
    provider: plantResult.provider,
  })
}
