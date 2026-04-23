import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { plantTree } from '@/lib/tree-nation'
import { CO2_TO_TREE_KG } from '@/lib/co2'

export const runtime = 'nodejs'
export const maxDuration = 60

// CRON quotidien (n8n) : pour chaque user ayant compensé ≥ 10kg CO2 non
// encore "traduit" en arbre, planter automatiquement 1 arbre par tranche
// atteinte. Auth : Bearer $CRON_SECRET (header ou ?token=...).
//
// Idempotent via la règle : trees_plantable = floor(co2/10) - trees_planted.
// Un nouvel appel ne replante pas tant que co2_offset_total_kg n'a pas
// franchi la tranche suivante.
//
// Cap batch : max 50 users par exécution pour ne pas saturer les calendriers
// OpenTimestamps. Les suivants sont traités au prochain run.

interface ProfileLite {
  id: string
  co2_offset_total_kg: number | string
  trees_planted_total: number
}

const BATCH_LIMIT = 50

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  if (url.searchParams.get('token') === expected) return true
  return false
}

async function run() {
  const admin = createServiceClient()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, co2_offset_total_kg, trees_planted_total')
    .gte('co2_offset_total_kg', CO2_TO_TREE_KG)
    .order('co2_offset_total_kg', { ascending: false })
    .limit(BATCH_LIMIT * 2)

  if (!profiles || profiles.length === 0) {
    return { planted: 0, processed: 0, skipped: 0 }
  }

  let planted = 0
  let processed = 0
  let skipped = 0

  for (const p of profiles as ProfileLite[]) {
    if (processed >= BATCH_LIMIT) break
    const co2 = Number(p.co2_offset_total_kg ?? 0)
    const already = p.trees_planted_total ?? 0
    const eligible = Math.floor(co2 / CO2_TO_TREE_KG)
    const toPlant = eligible - already

    if (toPlant < 1) {
      skipped += 1
      continue
    }

    processed += 1
    // Cap à 3 arbres par user par run pour lisser et éviter une avalanche
    // OTS en cas de rattrapage massif (user vient d'arriver).
    const count = Math.min(3, toPlant)

    for (let i = 0; i < count; i++) {
      const result = await plantTree({
        user_id: p.id,
        trip_id: null,
        tree_count: 1,
        co2_offset_kg: CO2_TO_TREE_KG,
        note: `CRON auto-plant (palier ${already + i + 1} × ${CO2_TO_TREE_KG}kg CO2)`,
      })

      const { error } = await admin.from('trees_planted').insert({
        user_id: p.id,
        trip_id: null,
        provider: result.provider,
        tree_count: 1,
        co2_offset_kg: CO2_TO_TREE_KG,
        cost_cents: 0,
        certificate_url: result.certificate_url,
        ots_proof: result.ots_proof,
      })

      if (!error) planted += 1
    }

    await admin
      .from('profiles')
      .update({ trees_planted_total: already + count })
      .eq('id', p.id)
  }

  return { planted, processed, skipped }
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await run()
    return NextResponse.json({ ok: true, ...result, ran_at: new Date().toISOString() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erreur inconnue'
    return NextResponse.json({ error: `CRON plant-trees: ${msg}` }, { status: 500 })
  }
}

// Permettre un GET pour test manuel via curl ?token=
export async function GET(req: Request) {
  return POST(req)
}
