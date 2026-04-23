// lib/tree-nation.ts — Tree-Nation API client (provider-agnostic, 0 hallucination)
//
// État 2026-04-23 (§7 Law 6 CLAUDE.md — JAMAIS inventer une API) :
// Tree-Nation API requiert une inscription manuelle (support@tree-nation.com)
// pour obtenir un TEST token. Postman Collection accessible après email
// validé. Pas de sandbox public auto-service.
//
// Stratégie provider-agnostic :
//  - Si TREE_NATION_API_KEY absent  → provider = 'manual' (Tissma plante
//    en batch mensuel via dashboard Tree-Nation, app enregistre l'intention
//    + horodatage OpenTimestamps blockchain → preuve d'intention scellée).
//  - Si TREE_NATION_API_KEY présent → client réel prévu ; l'implémentation
//    sera ajoutée quand le TEST token + Postman docs seront fournis
//    (Tissma fait le signup). Pour l'instant, retourne un résultat "manual"
//    par sécurité pour ne PAS appeler une URL non documentée.
//
// À faire Tissma pour activer le mode réel :
//  1. Créer compte sur tree-nation.com (gratuit)
//  2. Remplir form "API Token request" (Help → API)
//  3. Recevoir TREE_NATION_API_KEY_TEST par email
//  4. Fournir la Postman Collection complète à Claude Code
//  5. Je branche le client réel en 1 session (remplace `plantManual` ici)

import { stampString } from '@/lib/opentimestamps'

export type TreeProvider = 'tree_nation' | 'ecosia' | 'reforest_action' | 'manual'

export interface PlantRequest {
  user_id: string
  trip_id: string | null
  tree_count: number
  co2_offset_kg: number
  note?: string
}

export interface PlantResult {
  provider: TreeProvider
  external_id: string | null
  certificate_url: string | null
  ots_proof: string | null
  payload_hash: string
}

const ENV_KEY = 'TREE_NATION_API_KEY'

export function hasTreeNationKey(): boolean {
  return Boolean(process.env[ENV_KEY]?.trim())
}

/**
 * Planter 1 ou plusieurs arbres. Le résultat contient toujours un hash de la
 * requête + une preuve OpenTimestamps (même en mode manual), scellant
 * l'intention sur la blockchain Bitcoin publique.
 */
export async function plantTree(req: PlantRequest): Promise<PlantResult> {
  const canonicalPayload = JSON.stringify({
    user_id: req.user_id,
    trip_id: req.trip_id,
    tree_count: req.tree_count,
    co2_offset_kg: req.co2_offset_kg,
    note: req.note ?? null,
    timestamp_utc: new Date().toISOString(),
    provider_target: hasTreeNationKey() ? 'tree_nation' : 'manual',
  })

  const { hash, ots_proof_base64 } = await stampString(canonicalPayload)

  // Mode réel — non implémenté tant que Postman Collection + TEST token
  // ne sont pas fournis (§Règle #0 CLAUDE.md : penser, vérifier, puis coder).
  // Quand activé, il faudra :
  //   const res = await fetch(`${process.env.TREE_NATION_BASE_URL}/plantings`, {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${process.env.TREE_NATION_API_KEY}` },
  //     body: JSON.stringify({ quantity: req.tree_count, user_ref: req.user_id }),
  //   })
  // → sera branché après réception des docs.

  return {
    provider: 'manual',
    external_id: null,
    certificate_url: null,
    ots_proof: ots_proof_base64,
    payload_hash: hash,
  }
}
