# YANA — Stripe Live Mode (post-SASU)

> Activation Stripe live pour YANA. 3 plans VITAE (9,99 / 49,99 / 99,99) cohérents BRIEF VITAE §20. Wealth Engine activé 50/10/40.

## ① Stripe Account — Réutilisation SASU

> Si Stripe SASU déjà actif (SHANTI/MUKTI/ADYA/SANGHA) → **passer directement à ②**.

## ② Products + Prices YANA

URL : https://dashboard.stripe.com/products → New product.

### Plan Essentiel — 9,99€/mois

| Champ | Valeur |
|---|---|
| Product name | `Yana — Plan Essentiel` |
| Description | `Score conducteur, écoconduite stats, 1 véhicule.` |
| Price | 9,99 € recurring monthly |
| Lookup key | `yana_essentiel_monthly` |
| Tax behavior | Inclusive (TTC) ou Exclusive (HT, art. 293B) |
| Trial | 7 days |
| Statement descriptor | `YANA*PURAMA` |

### Plan Infini — 49,99€/mois

| Champ | Valeur |
|---|---|
| Product name | `Yana — Plan Infini` |
| Description | `+ Covoiturage + Insurance discount eligibility + 5 véhicules + NAMA-PILOTE coach.` |
| Price | 49,99 € recurring monthly |
| Lookup key | `yana_infini_monthly` |
| Trial | 7 days |
| Statement descriptor | `YANA*PURAMA` |

### Plan Légende — 99,99€/mois

| Champ | Valeur |
|---|---|
| Product name | `Yana — Plan Légende` |
| Description | `+ Family fleet management (10 véhicules) + Concours Top conducteurs + early access features.` |
| Price | 99,99 € recurring monthly |
| Lookup key | `yana_legende_monthly` |
| Trial | 7 days |
| Statement descriptor | `YANA*PURAMA` |

### Annual prepay (-20%)

| Plan | Annual price | Saving |
|---|---|---|
| Essentiel Annual | 95,90 € (vs 119,88 €) | 20% |
| Infini Annual | 479,90 € (vs 599,88 €) | 20% |
| Légende Annual | 959,90 € (vs 1 199,88 €) | 20% |

### Stocker Price IDs via Vercel CLI

```bash
VERCEL_TOKEN=$(grep VERCEL_TOKEN .env.secrets | cut -d= -f2)
SCOPE="puramapro-oss"

printf "price_xxxx\n" | vercel env add STRIPE_PRICE_ESSENTIEL_MONTHLY production --token $VERCEL_TOKEN --scope $SCOPE
printf "price_xxxx\n" | vercel env add STRIPE_PRICE_INFINI_MONTHLY production --token $VERCEL_TOKEN --scope $SCOPE
printf "price_xxxx\n" | vercel env add STRIPE_PRICE_LEGENDE_MONTHLY production --token $VERCEL_TOKEN --scope $SCOPE
printf "price_xxxx\n" | vercel env add STRIPE_PRICE_ESSENTIEL_ANNUAL production --token $VERCEL_TOKEN --scope $SCOPE
printf "price_xxxx\n" | vercel env add STRIPE_PRICE_INFINI_ANNUAL production --token $VERCEL_TOKEN --scope $SCOPE
printf "price_xxxx\n" | vercel env add STRIPE_PRICE_LEGENDE_ANNUAL production --token $VERCEL_TOKEN --scope $SCOPE
```

## ③ Webhook prod

URL : https://dashboard.stripe.com/webhooks → Add endpoint.

```
URL : https://yana.purama.dev/api/stripe/webhook
Description : "YANA prod webhook (3 plans VITAE + Wealth Engine 50/10/40)"
API version : latest
```

**Events** (cohérent CLAUDE.md §17 setup) :
```
checkout.session.completed
checkout.session.expired
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.trial_will_end
customer.subscription.paused
customer.subscription.resumed
invoice.created
invoice.finalized
invoice.paid
invoice.payment_succeeded                    # Wealth Engine 50/10/40
invoice.payment_failed
invoice.payment_action_required
charge.refunded                              # Wealth Engine clawback
customer.updated
```

```bash
printf "whsec_xxxx\n" | vercel env add STRIPE_WEBHOOK_SECRET production --token $VERCEL_TOKEN --scope $SCOPE
```

## ④ Customer Portal

URL : Dashboard → Settings → Billing → Customer portal.

Activer :
- ☑ Update payment method
- ☑ View invoices history
- ☑ Cancel subscription anytime
- ☑ Switch between plans (proration)
- ☑ Pause subscription (max 90j — utile pour utilisateurs en arrêt voyage longue durée)
- ☑ Download invoices as PDF

## ⑤ Tax — TVA

| Régime SASU | Configuration Stripe |
|---|---|
| Franchise art. 293B | Stripe Tax : OFF. "TVA non applicable, art. 293B du CGI" sur invoices. |
| Réel simplifié | Stripe Tax : ON. VAT number SASU. Auto-collect TVA UE 20%. |

> YANA = Plan Légende 99,99€/mois × users → CA grimpe vite. Plan B : passer Réel simplifié à 5 000-10 000€ MRR.

## ⑥ Invoice customization

URL : Dashboard → Settings → Branding.

| Élément | Valeur |
|---|---|
| Logo | Logo YANA (orange + bleu, format 256×256 PNG) |
| Brand color | `#F97316` (orange route) |
| Statement descriptor | `YANA*PURAMA` |
| Receipt prefix | `YANA-2026-` |

## ⑦ Promo codes

URL : Dashboard → Products → Coupons.

| Code | Discount | Use case |
|---|---|---|
| `YANA1` | -100% × 1 mois | Beta launchers (50 users limit) |
| `ROUTE25` | -25% × 3 mois | Newsletter / press |
| `MOTO20` | -20% × 6 mois | Promo communauté motards |
| `FAMILLE` | -30% × 12 mois | Plan Légende family launch |
| `ASSURE` | -50% × 1 mois | Partenaires assureurs (offre découverte) |

## ⑧ Wealth Engine 50/10/40 — webhook handler

> YANA est compatible BRIEF VITAE §20 → 50% pool users / 10% Asso PURAMA / 40% SASU.

```typescript
// src/app/api/stripe/webhook/route.ts (extrait YANA)
import Stripe from "stripe";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")!;
  const body = await req.text();
  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const amount = invoice.amount_paid / 100;

    const poolUsers = amount * 0.5;
    const associationPurama = amount * 0.1;
    const sasuPurama = amount * 0.4;

    await supabase.schema("yana").from("wealth_pool_transactions").insert([
      { type: "pool_users_credit", amount_eur: poolUsers, source_invoice_id: invoice.id, app_slug: "yana" },
      { type: "association_purama_credit", amount_eur: associationPurama, source_invoice_id: invoice.id, app_slug: "yana" },
      { type: "sasu_purama_credit", amount_eur: sasuPurama, source_invoice_id: invoice.id, app_slug: "yana" },
    ]);

    // Pool YANA-spécifique : redistribué via :
    // - Graines pour conduite éco (mensuel, top 25% scores)
    // - Concours Top conducteurs sécurité (Plan Légende)
    // - Arbres plantés via Ecologi (CO2 économisé converti)
  }

  if (event.type === "charge.refunded") {
    // Clawback proportionnel
  }

  return Response.json({ received: true });
}
```

## ⑨ Subscription anti-churn

URL : Dashboard → Settings → Subscriptions → Smart retries.

| Setting | Valeur YANA |
|---|---|
| Smart retries | ☑ Activer (3 retries en 7-14j) |
| Network advances | ☑ Activer |
| Email dunning | ☑ Activer (3 emails sur 21j, ton bienveillant YANA) |
| Subscription pause | ☑ Activer (max 90j — utile pour vacances longue durée) |

### Email dunning custom (ton bienveillant)

```
Sujet : Petit pépin de paiement, on s'occupe de toi 🛣️

Bonjour {prénom},

On a essayé de prélever ton abonnement Yana, mais ta banque
n'a pas validé la transaction. Pas d'inquiétude, ça arrive.

Si tu veux maintenir ton accès au coach NAMA-PILOTE et
au scoring conducteur, mets à jour ton mode de paiement :

→ {portal_url}

Si tu préfères pauser quelques mois (changement de véhicule,
voyage longue durée) ou résilier, c'est aussi possible
depuis le même lien.

Tes trajets historiques restent enregistrés 14 jours pendant
qu'on retente. Au-delà, ton compte sera mis en sommeil
(jamais supprimé — tu peux revenir quand tu veux).

Avec présence sur la route,
L'équipe Yana 🛣️
```

## ⑩ Documents légaux YANA Stripe

À publier sur `yana.purama.dev` AVANT go-live :

| URL | Contenu |
|---|---|
| `/legal/cgv` | CGV B2C SaaS abonnement (rétractation EU 14j waivable) |
| `/legal/cgu` | CGU + référence à driving safety guidelines |
| `/legal/confidentialite` | Privacy policy + DPO + sous-traitants + AIPD CNIL |
| `/legal/aipd` | AIPD complète (analyse impact RGPD location data) |
| `/legal/insurance` | Conditions partage données assureurs (opt-in only) |
| `/legal/carpool` | CGU covoiturage (loi LOM 2019) |
| `/legal/transparency` | Rapport annuel modération carpool reviews |

## ⑪ Pricing page UX (yana.purama.dev/pricing)

```
┌────────────────────────────────────────────────────────────┐
│ ESSENTIEL          INFINI 🛣️           LÉGENDE             │
│                                                             │
│  9,99 €/mois        49,99 €/mois         99,99 €/mois       │
│  ou 95,90 €/an      ou 479,90 €/an       ou 959,90 €/an     │
│                                                             │
│ ✓ 1 véhicule       ✓ Tout Essentiel    ✓ Tout Infini        │
│ ✓ Score conducteur ✓ 5 véhicules       ✓ 10 véhicules       │
│ ✓ Écoconduite      ✓ Covoiturage       ✓ Family fleet       │
│ ✓ Anti-fatigue     ✓ Insurance discount ✓ Concours top      │
│ ✓ Trajets illimités✓ NAMA-PILOTE coach  ✓ Early access      │
│                                                             │
│ [Activer]          [Activer Infini]    [Activer Légende]    │
│                                                             │
│       7 jours d'essai gratuit, sans CB requise              │
└────────────────────────────────────────────────────────────┘

  Code MOTO20 : -20% × 6 mois si tu actives un véhicule moto
  Code FAMILLE : -30% × 12 mois sur Plan Légende
```

## ⑫ Test webhook end-to-end

1. Créer user test prod : `dev+yanatest@purama.dev`.
2. Subscribe Plan Infini via Checkout live.
3. Carte test live (carte personnelle Tissma).
4. Vérifier webhook reçu : Dashboard → Webhooks → endpoint → Events.
5. Vérifier Supabase schema yana : `subscriptions`, `wealth_pool_transactions` rows insérées.
6. Refund subscription (drill) pour pas être facturé.

## ⑬ Smoke tests post-live

```bash
# Live mode confirmé
curl -s -u "${STRIPE_SECRET_KEY}:" https://api.stripe.com/v1/account \
  | jq '{ livemode, country, charges_enabled }'

# Webhook actif
curl -s -u "${STRIPE_SECRET_KEY}:" https://api.stripe.com/v1/webhook_endpoints \
  | jq '.data[] | select(.url | test("yana")) | { id, url, status }'

# Products visibles
curl -s -u "${STRIPE_SECRET_KEY}:" "https://api.stripe.com/v1/products?active=true" \
  | jq '.data[] | select(.name | test("Yana")) | { id, name }'

# Pricing page
curl -s "https://yana.purama.dev/pricing" | grep -E "(9,99|49,99|99,99)"
```

## ⑭ Si KYC rejet

YANA = SaaS mobilité, profil de risque faible côté Stripe. Sauf si Stripe pose questions sur "insurance partnerships" → expliquer YANA ne vend pas d'assurance, juste des leads opt-in.

Backup : Mollie (concurrent EU OK pour B2C SaaS).

## ⑮ Cohérence avec partenaires assureurs

> YANA reçoit potentiellement des **commissions de leads** des assureurs partenaires.

### Si Tissma signe avec MAIF / Direct Assurance / etc.

- Commission peut transiter via Stripe Connect (Standard ou Express account).
- OU : facture YANA → assureur, hors Stripe (B2B classique mensuel).
- Le choix dépend du volume + partenariat structure.

### Documentation séparée

Voir `INSURANCE_PARTNERSHIPS.md` pour détails commercial + ACPR + ORIAS.

## ⑯ Timeline YANA Stripe

| Jour | Action |
|---|---|
| J1 | Si Stripe SASU déjà live → passer J3 |
| J1-2 | Sinon, KYC submit |
| J3 | Products + Prices créés (3 plans + 3 annual) |
| J3 | Webhook prod activé + secret stocké Vercel |
| J4 | Test end-to-end (paiement réel + refund) |
| J5 | Customer Portal config |
| J6 | Documents légaux publiés (CGV + CGU + Privacy + AIPD + CarPool legal) |
| J7 | Pricing page UX validée + smoke tests |
| J7 | YANA Stripe live ready |

→ **7 jours total** si Stripe SASU déjà actif, 14 jours si premier setup.

## TL;DR

> YANA Stripe = setup classique 3 plans VITAE (9,99/49,99/99,99) + Wealth Engine 50/10/40 + Customer Portal + dunning bienveillant.
> Bottleneck = activation Stripe SASU (si pas déjà fait).
> Pas de Treezor, pas de RevenueCat. Stack la plus simple PURAMA.
