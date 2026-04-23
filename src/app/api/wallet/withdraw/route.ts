import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// IBAN validation FR/EU — 15 à 34 caractères, alphanumérique, mod-97 check
function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

function validateIbanMod97(iban: string): boolean {
  if (iban.length < 15 || iban.length > 34) return false
  if (!/^[A-Z0-9]+$/.test(iban)) return false
  // Move first 4 chars to end, convert letters to digits (A=10 ... Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = ''
  for (const char of rearranged) {
    if (/[0-9]/.test(char)) {
      remainder += char
    } else {
      remainder += (char.charCodeAt(0) - 55).toString()
    }
  }
  // Compute mod 97 by chunks (number precision-safe)
  let mod = 0
  for (const digit of remainder) {
    mod = (mod * 10 + parseInt(digit, 10)) % 97
  }
  return mod === 1
}

function maskIban(iban: string): string {
  if (iban.length < 8) return '••••'
  return `${iban.slice(0, 4)}••••${iban.slice(-4)}`
}

function hashIban(iban: string): string {
  return createHash('sha256').update(iban).digest('hex')
}

const withdrawSchema = z.object({
  amountCents: z.number().int().min(500, 'Le retrait minimum est de 5 €').max(1_000_000, 'Retrait maximum 10 000 €'),
  iban: z.string().min(15).max(50),
})

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  AMOUNT_BELOW_MIN: { message: 'Le retrait minimum est de 5 €.', status: 400 },
  INVALID_IBAN: { message: 'IBAN invalide. Vérifie le format.', status: 400 },
  USER_NOT_FOUND: { message: 'Profil introuvable. Reconnecte-toi.', status: 404 },
  INSUFFICIENT_BALANCE: { message: 'Solde insuffisant pour ce retrait.', status: 400 },
  WITHDRAWAL_IN_PROGRESS: {
    message: 'Un retrait est déjà en cours. Attends son traitement avant d\'en demander un nouveau.',
    status: 409,
  },
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const parsed = withdrawSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json({ error: firstIssue?.message ?? 'Paramètres invalides.' }, { status: 400 })
  }

  const { amountCents } = parsed.data
  const iban = normalizeIban(parsed.data.iban)

  if (!validateIbanMod97(iban)) {
    return NextResponse.json({ error: 'IBAN invalide. Vérifie le format et les chiffres de contrôle.' }, { status: 400 })
  }

  const ibanMasked = maskIban(iban)
  const ibanHash = hashIban(iban)

  const admin = createServiceClient()
  const { data, error } = await admin.rpc('request_withdrawal', {
    p_user_id: user.id,
    p_amount_cents: amountCents,
    p_iban_masked: ibanMasked,
    p_iban_hash: ibanHash,
  })

  if (error) {
    return NextResponse.json({ error: 'Une erreur est survenue. Réessaie dans un instant.' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data

  if (row?.error_code) {
    const mapped = ERROR_MESSAGES[row.error_code] ?? { message: 'Erreur inconnue.', status: 500 }
    return NextResponse.json(
      { error: mapped.message, code: row.error_code, balanceCents: row.new_balance_cents },
      { status: mapped.status },
    )
  }

  return NextResponse.json({
    success: true,
    withdrawalId: row.withdrawal_id,
    newBalanceCents: row.new_balance_cents,
    ibanMasked,
  })
}
