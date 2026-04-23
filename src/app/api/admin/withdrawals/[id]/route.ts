import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  action: z.enum(['approve', 'reject', 'complete']),
  reason: z.string().trim().max(500).optional(),
})

interface WithdrawalRow {
  id: string
  user_id: string
  amount_cents: number
  status: string
}

// POST /api/admin/withdrawals/[id] — approve/reject/complete d'un retrait.
// - approve : status pending → processing
// - complete : status processing → completed (le virement SEPA a été exécuté)
// - reject : status pending|processing → rejected + compensation wallet
//            (re-crédit du montant bloqué côté withdrawal sur le wallet_balance)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Identifiant retrait invalide.' }, { status: 400 })
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
  const { data: withdrawal } = await admin
    .from('withdrawals')
    .select('id, user_id, amount_cents, status')
    .eq('id', id)
    .maybeSingle<WithdrawalRow>()

  if (!withdrawal) {
    return NextResponse.json({ error: 'Retrait introuvable.' }, { status: 404 })
  }

  const { action, reason } = parsed.data

  if (action === 'approve') {
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: 'Seuls les retraits "pending" peuvent être approuvés.' },
        { status: 409 },
      )
    }
    const { error } = await admin
      .from('withdrawals')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) {
      return NextResponse.json(
        { error: 'Mise à jour impossible.' },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true, action, status: 'processing' })
  }

  if (action === 'complete') {
    if (!['processing', 'pending'].includes(withdrawal.status)) {
      return NextResponse.json(
        { error: 'Seuls les retraits "pending"/"processing" peuvent être complétés.' },
        { status: 409 },
      )
    }
    const { error } = await admin
      .from('withdrawals')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      return NextResponse.json(
        { error: 'Mise à jour impossible.' },
        { status: 500 },
      )
    }
    // Note : le débit wallet a déjà été effectué dans request_withdrawal RPC
    // (direction='debit', reason='withdrawal_request'). Pas de nouvelle écriture
    // wallet_transactions — l'état "completed" est l'information de statut.
    return NextResponse.json({ ok: true, action, status: 'completed' })
  }

  // reject : compensation wallet (le debit initial RPC était irréversible,
  // on le re-crédite ici en créant une tx "in").
  if (!['pending', 'processing'].includes(withdrawal.status)) {
    return NextResponse.json(
      { error: 'Seuls les retraits "pending"/"processing" peuvent être rejetés.' },
      { status: 409 },
    )
  }

  const { error: updateError } = await admin
    .from('withdrawals')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      rejection_reason: reason ?? 'Rejeté par administration',
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Mise à jour impossible.' },
      { status: 500 },
    )
  }

  // Compensation : re-crédit wallet_balance_cents côté profil + log tx credit.
  const { data: profile } = await admin
    .from('profiles')
    .select('wallet_balance_cents')
    .eq('id', withdrawal.user_id)
    .maybeSingle()

  if (profile) {
    const newBalance = Number(profile.wallet_balance_cents ?? 0) + withdrawal.amount_cents
    await admin
      .from('profiles')
      .update({ wallet_balance_cents: newBalance })
      .eq('id', withdrawal.user_id)
    await admin.from('wallet_transactions').insert({
      user_id: withdrawal.user_id,
      amount_cents: withdrawal.amount_cents,
      direction: 'credit',
      reason: 'withdrawal_rejected_refund',
      ref_type: 'withdrawal',
      ref_id: id,
      balance_after_cents: newBalance,
    })
  }

  return NextResponse.json({ ok: true, action, status: 'rejected' })
}
