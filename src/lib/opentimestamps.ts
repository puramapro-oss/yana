// Reçu OpenTimestamps d'une empreinte SHA-256, à conserver avec la donnée.
// Le reçu initial est provisoire : il ne prouve ni une plantation physique,
// ni un ancrage Bitcoin vérifié. YANA ne vérifie pas encore cet ancrage.
// Le transport borné réutilise les primitives officielles ; l'ancien
// point d'entrée javascript-opentimestamps et son transport ne sont pas chargés.

import crypto from 'node:crypto'
import DetachedTimestampFile from 'opentimestamps/src/detached-timestamp-file.js'
import Ops from 'opentimestamps/src/ops.js'
import Context from 'opentimestamps/src/context.js'
import Timestamp from 'opentimestamps/src/timestamp.js'
import Notary from 'opentimestamps/src/notary.js'
import { createOtsStamper, type OtsLibrary } from './ots-stamp.ts'

const ots = createOtsStamper({ DetachedTimestampFile, Ops, Context, Timestamp, Notary } as OtsLibrary)

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function sha256Bytes(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest()
}

/**
 * Horodate un hash SHA-256 via les calendriers OpenTimestamps publics.
 * Retourne le reçu provisoire .ots en base64 — à persister en DB.
 * Retourne null si l'empreinte est invalide ou les calendriers indisponibles ; l'appelant doit
 * continuer sans OTS plutôt que bloquer l'opération métier (plantation arbre).
 */
export async function stampHashHex(sha256HexStr: string): Promise<string | null> {
  if (typeof sha256HexStr !== 'string' || !/^[a-fA-F0-9]{64}$/.test(sha256HexStr)) return null
  try {
    // L'entrée est déjà un digest : ne pas la hacher une seconde fois.
    return await ots.stampDigest(Buffer.from(sha256HexStr, 'hex'))
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
