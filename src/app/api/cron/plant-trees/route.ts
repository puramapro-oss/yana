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
// Les lectures préparent le lot ; la RPC verrouille chaque profil et revalide
// le crédit avant d'enregistrer l'intention et le compteur dans une transaction.
//
// Cap batch : max 50 users par exécution pour ne pas saturer les calendriers
// OpenTimestamps. Les suivants sont traités au prochain run.

interface ProfileLite {
  id: string
  co2_offset_total_kg: number | string
  trees_planted_total: number
}

interface TreePledgeResult {
  error_code: string | null
  tree: Record<string, unknown> | null
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

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, co2_offset_total_kg, trees_planted_total')
    .gte('co2_offset_total_kg', CO2_TO_TREE_KG)
    .order('co2_offset_total_kg', { ascending: false })
    .limit(BATCH_LIMIT * 2)

  if (profilesError) throw new Error('Lecture des profils impossible.')
  if (!profiles || profiles.length === 0) {
    return { planted: 0, processed: 0, skipped: 0, failed: 0, reconciliation_required: 0 }
  }

  let planted = 0
  let processed = 0
  let skipped = 0
  let failed = 0
  let reconciliationRequired = 0

  for (const p of profiles as ProfileLite[]) {
    if (processed >= BATCH_LIMIT) break
    const co2 = Number(p.co2_offset_total_kg ?? 0)
    const already = p.trees_planted_total ?? 0
    if (!Number.isFinite(co2) || co2 < 0 || !Number.isInteger(already) || already < 0) {
      failed += 1
      continue
    }
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

      if (result.provider !== 'manual') {
        failed += 1
        break
      }

      const { data: outcome, error } = await admin
        .rpc('record_manual_tree_pledge', {
          p_user_id: p.id,
          p_trip_id: null,
          p_ots_proof: result.ots_proof,
        })
        .single<TreePledgeResult>()

      if (error || !outcome) {
        failed += 1
        break
      }
      if (outcome.error_code === 'not_eligible' || outcome.error_code === 'profile_not_found') {
        if (i === 0) skipped += 1
        break
      }
      if (outcome.error_code || !outcome.tree) {
        failed += 1
        if (outcome.error_code === 'reconciliation_required') reconciliationRequired += 1
        break
      }
      planted += 1
    }
  }

  return { planted, processed, skipped, failed, reconciliation_required: reconciliationRequired }
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await run()
    return NextResponse.json(
      {
        ok: result.failed === 0,
        ...result,
        ...(result.failed ? { error: 'Certaines intentions n’ont pas pu être enregistrées.' } : {}),
        ran_at: new Date().toISOString(),
      },
      { status: result.failed ? 500 : 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erreur inconnue'
    return NextResponse.json({ error: `CRON plant-trees: ${msg}` }, { status: 500 })
  }
}

// Permettre un GET pour test manuel via curl ?token=
export async function GET(req: Request) {
  return POST(req)
}
