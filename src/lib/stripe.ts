import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    // LatestApiVersion n'existe pas comme type — omettre apiVersion (LEARNINGS #9 VIDA)
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true })
  }
  return _stripe
}

// ──────────────────────────────────────────────────────────────────
// YANA Stripe plans — 3 plans VITAE §20.1 fixes (9,99 / 49,99 / 99,99€)
// Annuel -33% sur chaque plan. Essai 14 jours.
// ──────────────────────────────────────────────────────────────────
export const YANA_STRIPE_PLANS = {
  essentiel: {
    monthly_cents: 999,    // 9,99€
    yearly_cents: 7999,    // 79,99€ soit -33%
    label: 'YANA Essentiel',
    description:
      "Tracking trajets illimité · score safety + eco + CO₂ · covoiturage Dual Reward · NAMA-PILOTE chat 20/j · multiplicateur gains ×1.",
    trial_days: 14,
    multiplier: 1,
  },
  infini: {
    monthly_cents: 4999,   // 49,99€
    yearly_cents: 39999,   // 399,99€ soit -33%
    label: 'YANA Infini',
    description:
      "Tout Essentiel · multiplicateur gains ×5 · chat illimité · multi-véhicules · Mode Moto premium · priorité covoiturage.",
    trial_days: 14,
    multiplier: 5,
  },
  legende: {
    monthly_cents: 9999,   // 99,99€
    yearly_cents: 79999,   // 799,99€ soit -33%
    label: 'YANA Legende',
    description:
      "Tout Infini · multiplicateur gains ×10 · concierge NAMA 24/7 · Safe Driver Badge certifié · 10 arbres plantés/mois · Ange Gardien.",
    trial_days: 14,
    multiplier: 10,
  },
} as const

export type YanaPlanId = keyof typeof YANA_STRIPE_PLANS

export async function createCheckoutSession(params: {
  customerId?: string
  customerEmail?: string
  userId?: string
  plan: YanaPlanId
  interval: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
  referralCode?: string
  trialDays?: number
}) {
  const stripe = getStripe()
  const planCfg = YANA_STRIPE_PLANS[params.plan]
  const amount = params.interval === 'monthly' ? planCfg.monthly_cents : planCfg.yearly_cents

  return stripe.checkout.sessions.create({
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    mode: 'subscription',
    payment_method_types: ['card', 'paypal', 'link'],
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: planCfg.label, description: planCfg.description },
          recurring: { interval: params.interval === 'monthly' ? 'month' : 'year' },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: params.trialDays ?? planCfg.trial_days,
      metadata: {
        plan: params.plan,
        interval: params.interval,
        ...(params.userId ? { user_id: params.userId } : {}),
        ...(params.referralCode ? { referral_code: params.referralCode } : {}),
      },
    },
    metadata: {
      plan: params.plan,
      interval: params.interval,
      ...(params.userId ? { user_id: params.userId } : {}),
      ...(params.referralCode ? { referral_code: params.referralCode } : {}),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe()
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
}
