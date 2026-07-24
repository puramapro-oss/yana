import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import type { Plan } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_PLANS = new Set<Plan>(['free', 'essentiel', 'infini', 'legende'])
const PLAN_MULTIPLIERS: Record<Plan, number> = {
  free: 1,
  essentiel: 1,
  infini: 5,
  legende: 10,
}

function inferPlanFromMetadata(metadata?: Stripe.Metadata | null): Plan {
  const raw = metadata?.plan
  if (raw && VALID_PLANS.has(raw as Plan) && raw !== 'free') return raw as Plan
  return 'essentiel'
}

// Idempotency (§security C4) — log chaque event handled
async function logEvent(eventId: string, eventType: string, payload: unknown) {
  const admin = createServiceClient()
  await admin
    .from('stripe_webhook_log')
    .insert({ event_id: eventId, event_type: eventType, payload, processed: true, processed_at: new Date().toISOString() })
    .select()
    .maybeSingle()
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('stripe_webhook_log')
    .select('event_id, processed')
    .eq('event_id', eventId)
    .maybeSingle()
  return Boolean(data?.processed)
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const admin = createServiceClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const item = sub.items.data[0]

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!profile) return

  const isActive = sub.status === 'active' || sub.status === 'trialing'
  const plan: Plan = isActive ? inferPlanFromMetadata(sub.metadata) : 'free'

  await admin
    .from('profiles')
    .update({
      plan,
      plan_multiplier: PLAN_MULTIPLIERS[plan],
      stripe_subscription_id: sub.id,
      subscription_started_at: sub.start_date ? new Date(sub.start_date * 1000).toISOString() : null,
      subscription_status: sub.status,
    })
    .eq('id', profile.id)

  const amountCents = item?.price.unit_amount ?? 0
  if (amountCents > 0) {
    await admin.from('payments').insert({
      user_id: profile.id,
      stripe_payment_intent_id: sub.latest_invoice as string | null,
      amount_cents: amountCents,
      currency: item?.price.currency ?? 'eur',
      status: isActive ? 'succeeded' : 'pending',
    })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const admin = createServiceClient()
  const stripe = getStripe()

  // Save Stripe customer id on profile
  if (session.mode === 'subscription') {
    const userId = session.metadata?.user_id
    if (session.customer && userId) {
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer.id
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId)
    }
    if (session.subscription) {
      const subId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const sub = await stripe.subscriptions.retrieve(subId)
      await handleSubscriptionUpsert(sub)
    }
  }

  // Referral commission attribution (50% premier paiement — CLAUDE.md referral)
  // Idempotency : check referrals.status != 'subscribed' AVANT crédit (LEARNINGS #28)
  const refCode = session.metadata?.referral_code
  const refUserId = session.metadata?.user_id
  if (refCode && refUserId && session.amount_total) {
    const { data: referrer } = await admin
      .from('profiles')
      .select('id, wallet_balance_cents')
      .eq('referral_code', refCode)
      .maybeSingle()
    if (referrer && referrer.id !== refUserId) {
      const { data: existingRef } = await admin
        .from('referrals')
        .select('id, status')
        .eq('referrer_id', referrer.id)
        .eq('referred_id', refUserId)
        .maybeSingle()

      // Skip si déjà crédité (anti double-crédit retry Stripe — LEARNINGS #28)
      if (!existingRef || existingRef.status !== 'subscribed') {
        const commissionCents = Math.floor(session.amount_total * 0.5)
        const currentBalance = Number(referrer.wallet_balance_cents ?? 0)
        const newBalance = currentBalance + commissionCents

        // (a) update referral status
        if (existingRef) {
          await admin
            .from('referrals')
            .update({
              status: 'subscribed',
              first_payment_at: new Date().toISOString(),
              commission_cents: commissionCents,
            })
            .eq('id', existingRef.id)
        } else {
          await admin.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: refUserId,
            status: 'subscribed',
            first_payment_at: new Date().toISOString(),
            commission_cents: commissionCents,
            tier: 1,
          })
        }

        // (b) update wallet balance + insert transaction
        await admin
          .from('profiles')
          .update({ wallet_balance_cents: newBalance })
          .eq('id', referrer.id)
        await admin.from('wallet_transactions').insert({
          user_id: referrer.id,
          amount_cents: commissionCents,
          direction: 'credit',
          reason: `Commission parrainage 50% (code ${refCode})`,
          balance_after_cents: newBalance,
        })

        // (c) commission row + notification
        await admin.from('commissions').insert({
          user_id: referrer.id,
          amount_cents: commissionCents,
          commission_type: 'referral_n1',
          status: 'credited',
          stripe_invoice_id: session.invoice as string | null,
          credited_at: new Date().toISOString(),
        })
        await admin.from('notifications').insert({
          user_id: referrer.id,
          type: 'referral',
          title: '🎉 Commission parrainage reçue !',
          body: `Tu viens de gagner ${(commissionCents / 100).toFixed(2).replace('.', ',')} € grâce à un filleul.`,
          data: { action_url: '/wallet', icon: '💰' },
        })
      }
    }
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret)
    return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 400 })

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bad signature'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Idempotency (§C4)
  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, dedupe: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpsert(event.data.object)
        break
      default:
        break
    }
    await logEvent(event.id, event.type, event.data.object)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Webhook handler error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
