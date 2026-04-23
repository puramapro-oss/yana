import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOnfidoSignature } from '@/lib/onfido'

export const runtime = 'nodejs'

// Webhook Onfido (à activer quand ONFIDO_WEBHOOK_TOKEN sera fourni) :
//  - Header `X-SHA2-Signature` = HMAC-SHA256(body, ONFIDO_WEBHOOK_TOKEN)
//  - Events observés : check.completed, check.withdrawn, check.manually_reviewed
//  - Idempotency : onfido_webhook_events table (PK event_id)

interface OnfidoPayload {
  payload?: {
    resource_type?: string
    action?: string
    object?: {
      id?: string
      applicant_id?: string
      status?: string
      result?: string
    }
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-sha2-signature') ?? ''

  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  const valid = await verifyOnfidoSignature(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: OnfidoPayload
  try {
    payload = JSON.parse(rawBody) as OnfidoPayload
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const object = payload.payload?.object
  if (!object?.id) {
    return NextResponse.json({ ok: true, skipped: 'no_object_id' })
  }

  const eventId = `${payload.payload?.action ?? 'unknown'}-${object.id}`
  const admin = createServiceClient()

  // Idempotency
  const { data: alreadyProcessed } = await admin
    .from('onfido_webhook_events')
    .select('event_id, processed')
    .eq('event_id', eventId)
    .maybeSingle()

  if (alreadyProcessed?.processed) {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  await admin.from('onfido_webhook_events').upsert(
    { event_id: eventId, payload: payload as unknown as object, processed: false },
    { onConflict: 'event_id' },
  )

  const checkId = object.id
  const result = object.result // 'clear' = approved, 'consider' = rejected
  const status: 'approved' | 'rejected' | 'processing' =
    result === 'clear' ? 'approved' : result === 'consider' ? 'rejected' : 'processing'

  // Match verif via check_id
  const { data: verif } = await admin
    .from('kyc_verifications')
    .select('id, user_id')
    .eq('check_id', checkId)
    .maybeSingle()

  if (verif) {
    await admin
      .from('kyc_verifications')
      .update({
        status,
        completed_at: new Date().toISOString(),
        result_json: payload as unknown as object,
      })
      .eq('id', verif.id)

    if (status === 'approved' || status === 'rejected') {
      await admin.from('profiles').update({ onfido_status: status }).eq('id', verif.user_id)
    }
  }

  await admin
    .from('onfido_webhook_events')
    .update({ processed: true })
    .eq('event_id', eventId)

  return NextResponse.json({ ok: true, processed: true, status })
}
