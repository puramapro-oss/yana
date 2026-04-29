# YANA — Covoiturage Legal (Loi LOM 2019)

> Cadre légal covoiturage P2P entre conducteurs YANA. Conformité loi LOM (Loi d'Orientation des Mobilités) du 24 décembre 2019.
> **Critique** : YANA covoiturage = particulier-à-particulier, **pas transport professionnel**. Erreur = qualification VTC = licence + 100K€ d'amende.

## Cadre légal — Loi LOM 2019 art. 35

> "Le covoiturage se définit comme l'utilisation en commun d'un véhicule terrestre à moteur par un conducteur et un ou plusieurs passagers, effectuée à titre non onéreux, **excepté le partage des frais**, dans le cadre d'un déplacement que le conducteur effectue pour son propre compte."

### Conditions OBLIGATOIRES pour qualification "covoiturage" (vs transport pro)

1. ✅ Le conducteur effectue le trajet **pour son propre compte** (il y allait de toute façon).
2. ✅ Le tarif demandé ne dépasse pas **le partage des frais réels**.
3. ✅ Le conducteur n'a pas pour métier le transport.

### Sanctions si requalification "transport professionnel"

- Amende jusqu'à 15 000 € + suspension permis (Code des transports).
- Risque pénal si répétition : 1 an emprisonnement + 100 000 € amende.

> ⚠️ **YANA doit appliquer un plafond tarifaire strict** pour rester dans le cadre légal covoiturage.

## Plafond tarifaire YANA (basé sur barème fiscal IK)

Le barème fiscal kilométrique 2026 (source : impots.gouv.fr) :

| Puissance fiscale | Tarif € / km (jusqu'à 5 000 km/an) |
|---|---|
| 3 CV | 0,529 € |
| 4 CV | 0,606 € |
| 5 CV | 0,636 € |
| 6 CV | 0,665 € |
| 7 CV et + | 0,697 € |

**YANA prend 0,40 €/km** comme plafond cap (en-dessous du barème fiscal le plus bas) → **garantie qualification covoiturage** :

```typescript
// src/lib/carpool/pricing.ts
export const MAX_CARPOOL_PRICE_PER_KM = 0.40; // € / km, sub-fiscal cap

export function calculateMaxCarpoolPrice(distanceKm: number, passengerCount: number): number {
  // Le partage des frais doit être divisé par le nombre TOTAL de passagers + conducteur
  const totalCostMax = distanceKm * MAX_CARPOOL_PRICE_PER_KM;
  const pricePerPassengerMax = totalCostMax / (passengerCount + 1); // +1 = conducteur
  return Math.min(pricePerPassengerMax, totalCostMax); // safety cap
}
```

### Exemple calcul

- Trajet 200 km, 3 passagers
- Coût total max : 200 × 0,40 = 80 €
- Per passenger max : 80 / 4 = 20 € (avec conducteur)
- Conducteur reçoit : 60 € (3 × 20 €)
- Coût net conducteur : 80 € total - 60 € reçu = 20 € (sa propre part)

## UI/UX YANA covoiturage

### Onboarding conducteur covoitureur

```
Settings > Devenir covoitureur YANA
    ↓
Modal disclosure : "Conditions covoiturage"
    ↓
✓ Je certifie effectuer ce trajet pour mon compte personnel
✓ Je certifie ne pas être chauffeur VTC ou taxi professionnel
✓ Je comprends que le tarif est plafonné au partage des frais réels
✓ J'accepte les CGU covoiturage YANA
    ↓
Activer
```

### Création offre covoiturage

```
Nouveau covoiturage
    ↓
Trajet : Paris → Lyon (depuis trips analyzer ou manuel)
    ↓
Date / heure départ : auto-suggested basé sur trajet récurrent
    ↓
Places disponibles : 1 / 2 / 3 / 4
    ↓
Prix par place : [auto-calculé selon plafond YANA]
    ↓
⚠️ Tarif plafonné par YANA selon loi LOM 2019
    Distance × 0,40 € / nombre passagers
    
[Publier]
```

### Booking passager

```
Je cherche : Paris → Lyon, samedi 10/05
    ↓
Liste offres triées par :
  ★ Score conducteur YANA
  ★ Distance détour
  ★ Prix
    ↓
Choisir + Confirmer
    ↓
Paiement Stripe (paid à l'avance, hold)
    ↓
Trajet effectué
    ↓
Auto-release fund 24h après confirmation arrivée
```

## Modération covoiturage (P1)

> User reviews bidirectionnels entre conducteur et passager. Modération nécessaire.

### Categories de signalements

- **Behavior** : conducteur agressif, passager problématique.
- **Safety** : conduite dangereuse signalée par passager → boost weight in YANA scoring.
- **Tarif** : prix anormal (au-dessus plafond — bug) → fix immédiat.
- **No-show** : conducteur OU passager pas venu.

### Sanctions

- 1 review négative critique (3/5 ou moins) → warning silencieux.
- 3 reviews négatives en 90j → suspension 30j covoiturage uniquement.
- 5 reviews critiques en 90j → ban covoiturage permanent (compte YANA reste actif).
- Comportement criminel signalé (agression) → escalation P0 + Pharos.

## Stripe Connect — Flow paiement

### Architecture

```
Passager paye 20 € via Stripe Checkout
    ↓
PURAMA Stripe account reçoit 20 €
    ↓
Hold 24h après confirmation arrivée
    ↓
Stripe Transfer 18 € → Conducteur Connect Express account
    ↓
PURAMA garde 2 € commission (10%)
    ↓
Wealth Engine 50/10/40 sur les 2 € commission :
  - 1 € pool users
  - 0.20 € Asso PURAMA
  - 0.80 € SASU
```

### Conducteur Stripe Connect setup

```typescript
// src/app/api/carpool/onboard-driver/route.ts
import Stripe from "stripe";

export async function POST(req: Request) {
  const userId = await requireAuth(req);
  
  // Create Express account
  const account = await stripe.accounts.create({
    type: "express",
    country: "FR",
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: {
      yana_user_id: userId,
      onboarded_via: "yana_carpool",
    },
  });
  
  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `https://yana.purama.dev/carpool/onboard/refresh`,
    return_url: `https://yana.purama.dev/carpool/onboard/done`,
    type: "account_onboarding",
  });
  
  // Save in DB
  await supabase.schema("yana").from("carpool_drivers").insert({
    user_id: userId,
    stripe_account_id: account.id,
    onboarded: false,
  });
  
  return Response.json({ url: accountLink.url });
}
```

### Webhook handler — capture & transfer

```typescript
// src/app/api/stripe/webhook/route.ts (extrait carpool)
if (event.type === "checkout.session.completed" && metadata.type === "carpool_booking") {
  const session = event.data.object as Stripe.Checkout.Session;
  
  // Hold 24h jusqu'à confirmation arrivée
  await supabase.schema("yana").from("carpool_bookings").update({
    status: "paid_holding",
    paid_at: new Date(),
    auto_release_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).eq("stripe_session_id", session.id);
}

if (event.type === "carpool.confirm_arrival") { // custom event from app
  // Trigger transfer to conducteur
  await stripe.transfers.create({
    amount: bookingAmountCents - commissionCents,
    currency: "eur",
    destination: conducteurStripeAccountId,
    transfer_group: bookingId,
  });
}
```

## Données fiscales conducteur

> Si conducteur dépasse certains seuils, déclaration fiscale.

### Seuils (URSSAF + Code général des impôts)

- < 3 000 € / an de revenus covoiturage → **non imposable**, juste déclaration optionnelle.
- 3 000 - 8 000 € / an → revenus mobiliers à déclarer dans IR.
- > 8 000 € / an → URSSAF + IR + risque requalification activité pro.

### YANA implementation

```typescript
// src/lib/carpool/fiscal-tracking.ts
export async function checkAnnualThreshold(userId: string): Promise<{
  totalEarnings: number;
  warningLevel: 'safe' | 'declare' | 'pro_risk';
}> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  
  const { data } = await supabase.schema("yana")
    .from("carpool_bookings")
    .select("amount_eur")
    .eq("driver_id", userId)
    .gte("paid_at", yearStart.toISOString())
    .eq("status", "completed");
  
  const totalEarnings = (data ?? []).reduce((sum, b) => sum + b.amount_eur, 0);
  
  let warningLevel: 'safe' | 'declare' | 'pro_risk' = 'safe';
  if (totalEarnings > 3_000) warningLevel = 'declare';
  if (totalEarnings > 8_000) warningLevel = 'pro_risk';
  
  return { totalEarnings, warningLevel };
}

// Affiché dashboard conducteur
const formatWarning = (warningLevel: string) => {
  if (warningLevel === 'pro_risk') {
    return "⚠️ Tu approches le seuil de 8 000 €/an de revenus covoiturage. Au-delà, tu dois t'inscrire URSSAF auto-entrepreneur. Limite tes trajets ou consulte un comptable.";
  }
  if (warningLevel === 'declare') {
    return "ℹ️ Tu as dépassé 3 000 €/an. Pense à déclarer ces revenus dans ton impôt sur le revenu (case revenus mobiliers).";
  }
  return null;
};
```

## CGU Covoiturage — Sections obligatoires

> Sur `/legal/carpool-cgu` :

```
ARTICLE 1 — DÉFINITION
Le covoiturage YANA est l'utilisation en commun d'un véhicule par un
conducteur et un ou plusieurs passagers, dans le cadre d'un déplacement
que le conducteur effectue pour son propre compte. Cadre : loi LOM
n° 2019-1428 du 24 décembre 2019, article 35.

ARTICLE 2 — STATUT
YANA est une plateforme de mise en relation. YANA n'est pas
transporteur, n'est pas garant des trajets, et n'est pas responsable
en cas d'accident, vol, perte d'objets, retard.

ARTICLE 3 — TARIF
Le tarif maximum par km est plafonné par YANA à 0,40 €. Ce plafond est
inférieur au barème fiscal kilométrique 2026 (0,529 €/km minimum), ce
qui garantit la qualification "partage des frais" et exclut toute
qualification "transport professionnel rémunéré".

ARTICLE 4 — OBLIGATIONS CONDUCTEUR
Le conducteur s'engage à :
- Disposer d'un permis de conduire valide.
- Disposer d'une assurance auto en cours de validité (responsabilité
  civile minimum).
- Respecter le Code de la route.
- Respecter les passagers (pas d'agression verbale ou physique).
- Ne pas conduire sous influence d'alcool ou drogues.

ARTICLE 5 — OBLIGATIONS PASSAGER
- Respecter horaires + lieu rendez-vous.
- Respecter conducteur et autres passagers.
- Régler le tarif via paiement YANA Stripe (paiements en espèces
  interdits sur la plateforme).

ARTICLE 6 — RESPONSABILITÉ
YANA n'est pas garant. En cas de litige, conducteur et passager
règlent entre eux. YANA peut intervenir pour modération mais
n'a pas obligation de remboursement systématique.

ARTICLE 7 — ASSURANCE PASSAGER
Le passager est couvert par l'assurance "Responsabilité Civile" du
conducteur (obligatoire en France). Si conducteur sans assurance →
ban permanent + signalement.

ARTICLE 8 — DONNÉES PERSONNELLES
Cf Privacy Policy. Données conducteur partagées avec passager
(prénom, photo, score conducteur). Données passager partagées avec
conducteur (prénom, photo, point départ + arrivée).

ARTICLE 9 — RÉSILIATION
Conducteur ou passager peut résilier accès covoiturage à tout moment
via Settings. YANA peut ban un compte qui enfreint ces CGU.

ARTICLE 10 — JURIDICTION
Droit français. Tribunal de Commerce de Besançon (siège PURAMA SASU).
```

## Différenciation vs BlaBlaCar

> BlaBlaCar = leader marché covoiturage longue distance. YANA est complémentaire.

| Aspect | BlaBlaCar | YANA covoiturage |
|---|---|---|
| Type trajet | Long distance (> 100 km) | Courte distance (commute, trajets quotidiens) |
| Tarif | Variable, pricing free | Plafond strict 0,40€/km |
| Sélection | Recherche manuelle ville→ville | Auto-match basé sur tracking trajets habituels |
| Score conducteur | Reviews simples | Score YANA driving (sécurité + écoconduite) |
| Plus-value YANA | Conducteur qualifié + trajet existant déjà tracé | Pas de saisie manuelle |

## Pré-requis avant launch covoiturage

- [ ] CGU Covoiturage publiées + relues avocat (~500€ supplément groupé Apple/Stripe).
- [ ] Plafond tarifaire 0,40€/km implémenté + audit code (impossible de bypass).
- [ ] Stripe Connect Express activé pour SASU.
- [ ] Onboarding conducteur Stripe Express testé bout-en-bout.
- [ ] Webhook `checkout.session.completed` → carpool_bookings handler.
- [ ] Webhook `transfer.created` → audit log.
- [ ] Reviews bidirectionnels implémentés.
- [ ] Modération reviews (1 review/jour limit per user).
- [ ] Fiscal tracking conducteur (warnings 3K/8K seuils).
- [ ] Insurance partner alert : "Si conducteur sans assurance → ban".
- [ ] AIPD updated avec section covoiturage data sharing.

## Risques majeurs

### R1 — Requalification transport professionnel
**Mitigation** : plafond 0,40€/km + 1 trajet max/jour/conducteur (limite naturelle du "compte personnel") + monitoring fiscal.

### R2 — Conducteur sans assurance
**Mitigation** : checkbox "Je certifie avoir une assurance valide" + spot check random demande de preuve (PDF carte verte).

### R3 — Accident covoiturage
**Mitigation** : YANA n'est pas garant + assurance conducteur couvre passagers + disclaimer clair CGU.

### R4 — Fraude conducteur (no-show, surfacturation)
**Mitigation** : reviews bidirectionnels + ban graduel + remboursement passager si conducteur no-show > 2 fois.

## TL;DR

> YANA covoiturage = cadre légal LOM 2019 + plafond 0,40€/km < barème fiscal = qualification partage frais.
> Stripe Connect Express conducteur. Commission YANA 10%. Wealth Engine 50/10/40 sur la commission.
> CGU spécifique + AIPD updated + monitoring fiscal automatique.
> Risque #1 = requalification transport pro → mitigation par plafond strict + limite trajets/jour.
