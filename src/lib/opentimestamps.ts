// lib/opentimestamps.ts — horodatage blockchain Bitcoin gratuit (§35.9)
// Remplace OriginStamp (retired 2025-05-31) par javascript-opentimestamps.
// Usage : attester qu'un certificat d'arbre / une preuve de mission existait
// à un instant T via la blockchain Bitcoin publique — sans coût, sans clé.
//
// Flux :
//  1. On a une donnée (JSON sérialisé, string) → sha256 → 32 bytes
//  2. stampHashHex(sha256) → OTS proof (bytes) → base64 → DB
//  3. verifyProofBase64(proof, sha256) → { bitcoin_block, attested_at } ou null
//
// Note : le "stamp" initial utilise un calendrier OTS (HTTP async). Les
// calendriers agrègent les hash pendant ~1h puis les publient dans une
// transaction Bitcoin. Tant que la TX Bitcoin n'est pas confirmée, la
// preuve est "pending" (vérifiable mais pas encore ancrée). Ce délai
// n'est pas un problème pour notre cas (certificats "plantation" écrits
// maintenant, vérifiables plus tard).

import crypto from 'node:crypto'
// La lib n'a pas de types TS officiels ; signature minimale ci-dessous.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OpenTimestamps: {
  stamp: (detached: unknown) => Promise<void>
  DetachedTimestampFile: {
    fromHash: (op: unknown, hashBytes: Buffer | Uint8Array) => {
      serializeToBytes: () => Uint8Array
    }
    deserialize: (bytes: Uint8Array) => unknown
  }
  Ops: { OpSHA256: new () => unknown }
  verify?: (detachedStamped: unknown, detachedOriginal: unknown) => Promise<Record<string, unknown>>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('javascript-opentimestamps')

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function sha256Bytes(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest()
}

/**
 * Horodate un hash SHA-256 via les calendriers OpenTimestamps publics.
 * Retourne la preuve .ots encodée base64 — à persister en DB.
 * Retourne null si le stamp échoue (calendriers offline) — l'appelant doit
 * continuer sans OTS plutôt que bloquer l'opération métier (plantation arbre).
 */
export async function stampHashHex(sha256HexStr: string): Promise<string | null> {
  try {
    const hashBuffer = Buffer.from(sha256HexStr, 'hex')
    if (hashBuffer.length !== 32) return null

    const op = new OpenTimestamps.Ops.OpSHA256()
    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(op, hashBuffer)
    await OpenTimestamps.stamp(detached)
    const bytes = detached.serializeToBytes()
    return Buffer.from(bytes).toString('base64')
  } catch {
    return null
  }
}

/**
 * Horodate une string arbitraire (JSON canonique recommandé).
 * Retourne { hash, ots_proof_base64 } — les deux persistés côte à côte.
 */
export async function stampString(payload: string): Promise<{
  hash: string
  ots_proof_base64: string | null
}> {
  const hash = sha256Hex(payload)
  const ots_proof_base64 = await stampHashHex(hash)
  return { hash, ots_proof_base64 }
}
