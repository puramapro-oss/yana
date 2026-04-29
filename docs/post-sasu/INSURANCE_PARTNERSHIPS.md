# YANA — Insurance Partnerships (ACPR + ORIAS + RGPD)

> Stratégie partenariats assureurs pour YANA. Génération de leads opt-in vers assureurs partenaires (MAIF, MACIF, Direct Assurance, etc.).
> **Important** : YANA ne vend PAS d'assurance directement → pas de licence ORIAS requise en v1. Si évolution future → démarche ACPR.

## Modèle business v1.0

```
User YANA installe l'app
    ↓
Conduite tracée → Score X/100
    ↓
Si Score > 75 + opt-in user
    ↓
YANA propose : "Tu pourrais payer moins cher ton assurance auto."
    ↓
User clique "Voir les offres"
    ↓
Lead transmis à 1 assureur partenaire (selon profil + algorithme matching)
    ↓
Assureur contacte user directement (email + tel)
    ↓
Si user souscrit → YANA reçoit commission (45-150€ selon assureur)
```

> ⚠️ YANA n'est **pas un intermédiaire d'assurance** au sens DDA. C'est un **comparateur / apporteur d'affaires** non régulé (similaire à Lelynx, LeComparateurAssurance, etc. en sub-statut).

## Cadre légal

### YANA n'est PAS soumis à ACPR / ORIAS si :

1. ✅ YANA ne **vend pas** de contrats d'assurance.
2. ✅ YANA ne **présente pas** les contrats (pas de description tarifs, garanties, conditions).
3. ✅ YANA transmet uniquement **données du prospect** (avec consentement).
4. ✅ Communication explicit : "YANA n'est pas assureur. Met en relation avec partenaires."

### Si évolution future v2.0 (revente directe) :

→ Démarche ORIAS catégorie 4 (mandataire d'intermédiaire d'assurance) :
- Capacité professionnelle (formation 150h ou expérience).
- Garantie financière (50K€ minimum).
- RC professionnelle.
- Honorabilité (casier vierge).
- Délai : 4-6 mois inscription ORIAS.
- Coût : 1 500-3 000€ (formation + assurance RC).

## Partenaires ciblés (priorité décroissante)

### Tier 1 — Mutuelles bienveillantes

> Aligné avec valeurs PURAMA (pas de profit pur, communauté).

#### MAIF
- **Profil** : mutuelle assurance, valeurs sociales, conducteurs prudents.
- **Contact** : MAIF Partenariats Pro → maif.fr/professionnels.
- **Délai onboarding** : 4-8 semaines (validation interne).
- **Commission attendue** : 80-120€ par souscription confirmée.
- **Argument YANA** : "Conducteurs YANA Score > 75 sont 30% moins sinistreux statistiquement (preuve à fournir post-launch via étude interne anonymisée)."

#### MACIF
- **Profil** : mutuelle conducteurs, classique mais fiable.
- **Délai** : 4-8 semaines.
- **Commission** : 60-100€.

### Tier 2 — Assureurs spécialisés tech

#### Direct Assurance (groupe Allianz)
- **Profil** : assureur 100% online, ouvert aux partenariats tech.
- **Contact** : direct-assurance.fr/partenaires.
- **Délai** : 6-10 semaines.
- **Commission** : 100-150€.
- **Argument YANA** : data-driven scoring = niche premium.

#### LeLynx, LeComparateurAssurance, Assurland
- **Profil** : comparateurs (concurrents indirects YANA).
- **Modèle alternatif** : revente leads à comparateurs au lieu d'assureurs directs.
- **Commission** : 5-15€ par lead (volume ≥ 1000/mois).
- **Pour YANA** : utile pour user dont le profil ne match pas un assureur partenaire direct.

### Tier 3 — Insurtech moto/scooter

#### Lovys
- **Profil** : insurtech millennial, mensuel, sans engagement.
- **Niche** : conducteurs jeunes urbains.
- **Délai** : 2-4 semaines (insurtech = agile).
- **Commission** : 50-80€.

#### Luko (now Allianz Direct)
- **Profil** : ex-insurtech, racheté.
- **À vérifier** : si encore ouvert aux partenariats post-acquisition.

#### Wakam (white-label)
- **Profil** : assureur B2B2C, propose APIs blanches.
- **Modèle alternatif futur (v2)** : YANA crée une assurance white-label "YANA Insurance" via Wakam → revente directe (= démarche ORIAS).

## Architecture lead transmission

### Flow technique

```
User opt-in "Insurance discount eligibility" dans Settings
    ↓
Anonymized scoring summary généré :
{
  user_id: "anon_uuid", // ID anonymisé, pas user.id réel
  score_overall: 82,
  trips_count: 47,
  km_total: 8200,
  consistency_score: 0.87,
  vehicle_type: "car",
  vehicle_age_years: 4,
  region_iso: "FR-69" // INSEE region code
}
    ↓
Match algorithm : choisir 1-3 assureurs selon profil
    ↓
User clique "Voir les offres"
    ↓
POST https://yana.purama.dev/api/insurance/lead
    ↓
Backend transmet à API partenaire (avec lead tracking ID)
    ↓
Email + SMS user : "Tu vas être contacté(e) par MAIF dans les 48h"
```

### API partenaire (exemple MAIF mock)

```typescript
// src/lib/insurance-partners/maif.ts
export async function transmitLeadToMaif(lead: AnonymizedLead): Promise<{ leadId: string }> {
  const response = await fetch('https://api.maif.fr/partners/yana/leads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MAIF_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Yana-Tracking-Id': generateTrackingId(),
    },
    body: JSON.stringify({
      partner_id: 'YANA',
      anonymized_score: lead.score_overall,
      vehicle_type: lead.vehicle_type,
      vehicle_age_years: lead.vehicle_age_years,
      region: lead.region_iso,
      consent_proof: {
        consent_id: lead.consent_id,
        consent_timestamp: lead.consent_timestamp,
        consent_text_version: 'v1.2-2026-04',
      },
      contact_preferences: {
        email: true,
        phone: false, // user-configurable
      },
      // Note: PAS de PII (no email, no nom, no tel transmis)
      // L'assureur recevra contact info SEULEMENT après que user clique "M'intéresse"
    }),
  });
  
  if (!response.ok) {
    await Sentry.captureException(new Error(`MAIF lead transmission failed: ${response.status}`));
    throw new Error('Lead transmission failed');
  }
  
  return await response.json();
}
```

### Consentement user (RGPD-strict)

```typescript
// Settings > Insurance Discount Eligibility
const consentText = `
🛡️ Économise sur ton assurance auto

Si ton score conducteur YANA > 75, tu peux être éligible à des
remises chez nos partenaires assureurs (MAIF, MACIF, Direct
Assurance).

En activant cette fonctionnalité :
✓ YANA transmet UN RÉSUMÉ ANONYMISÉ de ton score à 1-3 assureurs
  partenaires (pas ton nom, pas ton email, pas ton téléphone).
✓ Si un assureur trouve ton profil intéressant, il te contactera
  par email (uniquement avec ton accord explicit).
✓ Tu peux désactiver cette fonctionnalité à tout moment.

📜 Bases légales :
- RGPD art. 6.1.a : consentement explicit.
- RGPD art. 7 : droit de retrait à tout moment.
- Données transmises pendant 30 jours (puis purge auto).
- Liste partenaires actuels : maif.fr, macif.fr, direct-assurance.fr.

[Activer]   [Plus tard]
`;
```

## RGPD — AIPD (Analyse d'Impact Protection des Données)

> YANA traite des données location continues + scoring → AIPD obligatoire.

### Sections AIPD requises

1. **Description du traitement**
   - Finalité : amélioration sécurité conducteur + écoconduite.
   - Catégories données : location, accélération, score, vehicle metadata.
   - Catégories personnes : conducteurs B2C ≥ 18 ans.

2. **Nécessité et proportionnalité**
   - Pourquoi background location ? → 99% trips perdus sans.
   - Pourquoi anonymisation 30 jours ? → minimisation.

3. **Risques pour les personnes**
   - Risque 1 : Stalking si data fuite → mitigation chiffrement at rest.
   - Risque 2 : Profilage assurance → mitigation opt-in + anonymisation.
   - Risque 3 : Tracking par tiers → mitigation aucun share sans opt-in.

4. **Mesures pour traiter les risques**
   - Chiffrement TLS 1.3 + AES-256.
   - Opt-in séparé partenaires assureurs.
   - Suppression sur demande RGPD art. 17 < 30j.
   - DPO actif + email contact.

5. **Validation DPO**
   - DPO PURAMA : ITGS Conseil → dpo@purama.dev.

### Soumission CNIL

> AIPD non obligatoire de soumettre à la CNIL (auto-déclaration), sauf si "risque élevé" identifié.

YANA = pas risque élevé en v1 (pas de scoring sensible santé, pas de mineurs). Donc :
1. AIPD interne rédigée (Tissma + DPO).
2. Publiée sur `/legal/aipd` (transparence).
3. Pas de soumission CNIL en v1.
4. Si v2 ajoute revente assurance directe → re-évaluer.

## Pricing commission lead

### Modèle économique YANA × Assureurs

| Type de lead | Prix moyen (€) | Volume estimé (≥ 5K users) |
|---|---|---|
| Lead qualifié (score > 75) | 80-120 € / lead → souscription | 5-10/mois |
| Lead simple comparateur | 5-15 € / lead transmis | 100-200/mois |
| Affiliation revente (si v2) | 30-40% commission souscription | TBD |

### Revenue forecast YANA via insurance leads (5 000 users actifs)

- 30% des users ont score > 75 = 1 500 users.
- 5% acceptent l'opt-in = 75 users/mois.
- 20% des leads = souscription = 15/mois.
- Commission moyenne 80€ = **1 200 €/mois** revenus side.

> Pas suffisant pour pivoter business, mais addition à Stripe subscriptions = 5-10% boost MRR.

## Stripe Connect (si commission flow)

> Si commission lead transite via Stripe (rare, B2B classique sinon).

URL : Dashboard → Connect → Settings.

Mode : **Standard accounts** (assureur a son propre Stripe + reverse charge).

Pour v1.0 : préférer facture B2B mensuelle hors Stripe (PURAMA → assureur). Plus simple.

## Documents légaux

### CGV section "Insurance Partnerships"

> Sur `/legal/cgv` :

```
Article X — Mise en relation avec partenaires assureurs

YANA peut, sur demande explicit de l'utilisateur, transmettre un résumé
anonymisé de son profil de conduite à des assureurs partenaires.

YANA n'est pas un intermédiaire d'assurance au sens du Code des
assurances. YANA n'a pas la qualité d'agent général, ni de courtier,
ni de mandataire d'intermédiaire.

YANA agit comme apporteur d'affaires non régulé.

Toute souscription de contrat d'assurance se fait directement entre
l'utilisateur et l'assureur. YANA ne perçoit AUCUNE rémunération
liée au contenu des contrats souscrits, mais UNIQUEMENT une commission
forfaitaire de mise en relation.

L'utilisateur peut désactiver cette fonctionnalité à tout moment dans
Settings > Insurance Discount Eligibility.

Liste des partenaires assureurs : (mise à jour mensuelle sur
yana.purama.dev/legal/insurance-partners).
```

## Pré-requis avant launch insurance partnerships

- [ ] AIPD interne rédigée + publiée `/legal/aipd`.
- [ ] CGV section insurance ajoutée + relue par avocat (~500€ supplément groupé).
- [ ] 1 partenaire assureur signé (recommandé MAIF en priorité).
- [ ] API integration testée bout-en-bout (lead transmission + tracking).
- [ ] Page `/legal/insurance-partners` à jour.
- [ ] Settings > Insurance Discount Eligibility avec consent text v1.x.
- [ ] Anonymization layer testée (zéro PII transmis avant souscription).
- [ ] DPO + Privacy Policy à jour.

## Si l'insurance partnership ne match pas YANA users

> Plan B : utiliser le scoring uniquement pour gamification + Wealth Engine, pas pour insurance.

- Top conducteurs sécurité = Concours mensuel Plan Légende → wallet redistribué.
- CO2 économisé = arbres plantés via Ecologi (visible dashboard).

## TL;DR

> YANA insurance = apporteur d'affaires non régulé v1.0 (pas ORIAS).
> Partenaires cibles : MAIF, MACIF, Direct Assurance (priorité), Lovys (moto), comparateurs (volume).
> Lead 80-120€ par souscription, ~1 200€/mois revenus side à 5 000 users.
> AIPD obligatoire + CGV section dédiée + opt-in séparé strict RGPD.
> Si v2 (revente directe) → ORIAS catégorie 4 (4-6 mois, 1 500-3 000€).
