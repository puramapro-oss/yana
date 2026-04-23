import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  triggerReferralMilestone,
  triggerContestWon,
  triggerTierReached,
} from '@/lib/email/schedule'

export const runtime = 'nodejs'
export const maxDuration = 30

// Endpoint interne — déclenche un email event (palier parrainage,
// concours gagné, niveau atteint). Appelé depuis /api/stripe/webhook,
// /api/cron/classement-weekly, ou code user-facing.
//
// POST /api/email/event
// Header : Authorization: Bearer $CRON_SECRET (ou ?token=...)
// Body JSON : { kind, user_id, payload }
//
// kind = "referral_milestone" | "contest_won" | "tier_reached"

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (auth === `Bearer ${expected}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('token') === expected
}

const ReferralPayload = z.object({
  palier_code: z.string().min(1),
  palier_name: z.string().min(1),
})
const ContestPayload = z.object({
  period_ref: z.string().min(1), // ex: "2026-W17"
  rank: z.number().int().min(1).max(100),
  amount_cents: z.number().int().min(0),
})
const TierPayload = z.object({
  level: z.number().int().min(1).max(999),
})

const EventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('referral_milestone'), user_id: z.string().uuid(), payload: ReferralPayload }),
  z.object({ kind: z.literal('contest_won'), user_id: z.string().uuid(), payload: ContestPayload }),
  z.object({ kind: z.literal('tier_reached'), user_id: z.string().uuid(), payload: TierPayload }),
])

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const event = parsed.data
  try {
    let result
    switch (event.kind) {
      case 'referral_milestone':
        result = await triggerReferralMilestone(event.user_id, {
          code: event.payload.palier_code,
          name: event.payload.palier_name,
        })
        break
      case 'contest_won':
        result = await triggerContestWon(event.user_id, {
          periodRef: event.payload.period_ref,
          rank: event.payload.rank,
          amountCents: event.payload.amount_cents,
        })
        break
      case 'tier_reached':
        result = await triggerTierReached(event.user_id, { level: event.payload.level })
        break
    }

    if (result.ok) {
      return NextResponse.json({ ok: true, resend_id: result.resendId })
    }
    return NextResponse.json(
      { ok: false, reason: result.reason, detail: result.detail },
      { status: 200 }, // 200 car "déjà envoyé" ou "unsubscribed" ne sont pas des erreurs système
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'server_error', detail: msg }, { status: 500 })
  }
}
