// lib/onfido.ts — KYC Onfido provider-agnostic (§10 KARMA-BRIEF TRUST PURAMA).
//
// Déclenché au 1er booking covoiturage (pas à l'inscription — §10 règle UX).
//
// État 2026-04-23 (§7 Law 6 CLAUDE.md — JAMAIS inventer une API) :
// Onfido nécessite inscription Onfido Business + API key provisioned manually
// par leur équipe. Tant que ONFIDO_API_TOKEN absent :
//   - startKyc() retourne provider='manual' + status='pending'
//     → l'UI affiche "Vérification d'identité en liste d'attente"
//   - Le super admin peut simuler une approbation via /api/kyc/simulate
//   - Quand Tissma aura la clé : SDK Onfido Web réel branché ici sans
//     modifier l'UI côté /carpool/[id] (contrat stable).
//
// Flux réel cible (Onfido SDK v14+) :
//   1. POST /v3.6/applicants        → { applicant_id }
//   2. POST /v3.6/sdk_token         → { sdk_token } (scope: applicant)
//   3. Client render Onfido Web SDK → user uploads doc + selfie
//   4. Server POST /v3.6/checks     → { check_id }
//   5. Webhook /api/kyc/webhook     → update status + HMAC-SHA256 verify

export type KycProvider = 'onfido' | 'jumio' | 'idnow'
export type KycStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'expired'
export type KycTrigger = 'terra_nova_activation' | 'carpool_first_booking'

export interface StartKycRequest {
  user_id: string
  email: string | null
  trigger: KycTrigger
}

export interface StartKycResult {
  provider: KycProvider
  applicant_id: string | null
  sdk_token: string | null               // null si mode fallback (pas de clé)
  check_id: string | null
  status: KycStatus
  fallback_reason?: string
}

export function hasOnfidoKey(): boolean {
  return Boolean(process.env.ONFIDO_API_TOKEN?.trim())
}

export async function startKyc(req: StartKycRequest): Promise<StartKycResult> {
  if (!hasOnfidoKey()) {
    return {
      provider: 'onfido',
      applicant_id: null,
      sdk_token: null,
      check_id: null,
      status: 'pending',
      fallback_reason:
        "Vérification d'identité bientôt disponible — ton dossier est en liste d'attente.",
    }
  }

  // À implémenter une fois ONFIDO_API_TOKEN fourni — voir en tête de fichier
  // pour les 5 étapes exactes. Renvoi pending pour l'instant même avec clé,
  // car toucher une API non documentée en prod = bug garanti (§CLAUDE.md §7).
  return {
    provider: 'onfido',
    applicant_id: null,
    sdk_token: null,
    check_id: null,
    status: 'pending',
    fallback_reason:
      'Onfido client à brancher après réception de la doc officielle (flag Tissma).',
  }
}

/**
 * Vérifie une signature HMAC-SHA256 Onfido webhook.
 * Exporté pour que `/api/kyc/webhook` l'utilise quand la clé sera active.
 */
export async function verifyOnfidoSignature(
  rawBody: string,
  signatureHex: string,
): Promise<boolean> {
  const secret = process.env.ONFIDO_WEBHOOK_TOKEN
  if (!secret) return false
  try {
    const crypto = await import('node:crypto')
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    if (expected.length !== signatureHex.length) return false
    // timing-safe compare
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHex))
  } catch {
    return false
  }
}
