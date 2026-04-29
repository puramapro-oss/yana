# YANA — Post-SASU doc pack

> Pack post-SASU pour YANA (PURAMA Mobility Wellness — KARMA de la route).
> À activer dès que SASU PURAMA est immatriculée + comptes activés.
>
> ⚠️ **Note sur le scope** : YANA = app **mobilité voiture + moto** (sécurité routière, écoconduite, fatigue detection, covoiturage, sagesse voyage NAMA-PILOTE), **pas** digital detox/silence. Le code existant dans `~/purama/yana/src/` confirme ce scope (`Vehicle`, `Trip`, `TripEvent`, `Carpool`, `FatigueSession`, `TreePlanted` types). Pack rédigé en cohérence avec le code.

## Identité YANA

- **Slug** : `yana` (sanskrit यान = véhicule / voyage)
- **Bundle** : `dev.purama.yana`
- **Sous-domaine prod** : `yana.purama.dev`
- **Cible** : 18+ (titulaires permis B/A), conducteurs voiture/moto/scooter
- **IA name** : "NAMA-PILOTE" (sécurité routière + écoconduite + sagesse voyage)
- **Stack mobile** : Capacitor 8 live WebView (cohérent SHANTI/MUKTI/NIDRA/SANGHA)
- **Pricing** : 3 plans VITAE — Essentiel 9,99€ (×1) / Infini 49,99€ (×5) / Légende 99,99€ (×10)
- **Wealth Engine** : compatible (50/10/40 BRIEF VITAE §20.2)

## Différenciation vs autres apps PURAMA

YANA introduit le **5ème archétype** de l'écosystème PURAMA après wellness × emotional × financial × B2B × community :

> **6ème archétype : MOBILITY** — capteurs natifs (accéléromètre + GPS + gyroscope + magnétomètre), risk scoring, partenariats assureurs, covoiturage P2P, anti-fatigue.

Cela impose :
- Permissions GPS background (Apple Significant Location Changes, Android FOREGROUND_SERVICE_LOCATION).
- Sécurité driving-mode UI (anti-distraction au volant — guideline 2.5.13 Apple).
- Anti-tampering scoring (un user qui simule "bonne conduite" pour wallet/insurance discounts).
- Cadre légal covoiturage (loi LOM 2019 — limite tarifaire frais réels).
- Possible partenariat Tesla (depuis Tissma a Tesla — IK pro déjà acté §26 CLAUDE.md).

## Index des documents

| # | Fichier | Lignes (approx) | Critique pour |
|---|---|---|---|
| 1 | [APPLE_DEVELOPER_SETUP.md](./APPLE_DEVELOPER_SETUP.md) | 380 | iOS submission Travel/Lifestyle, GL 2.5.13 driving |
| 2 | [GOOGLE_PLAY_SETUP.md](./GOOGLE_PLAY_SETUP.md) | 320 | Android Auto & Vehicles category, location perms |
| 3 | [STRIPE_LIVE_CHECKLIST.md](./STRIPE_LIVE_CHECKLIST.md) | 290 | 3 plans 9,99/49,99/99,99 + Wealth Engine |
| 4 | [MOBILE_FRAMEWORK_DECISION.md](./MOBILE_FRAMEWORK_DECISION.md) | 230 | Capacitor + sensor plugins (accelerometer/GPS/gyro) |
| 5 | [DRIVING_SAFETY_GUIDELINES.md](./DRIVING_SAFETY_GUIDELINES.md) | 280 | Anti-distraction UI, voice-only, Apple GL 2.5.13 |
| 6 | [INSURANCE_PARTNERSHIPS.md](./INSURANCE_PARTNERSHIPS.md) | 260 | MAIF/MACIF/Direct Assurance, ACPR compliance |
| 7 | [CARPOOL_LEGAL.md](./CARPOOL_LEGAL.md) | 240 | Loi LOM 2019, frais réels, qualification non-pro |
| 8 | [ANTI_TAMPERING.md](./ANTI_TAMPERING.md) | 250 | Risk scoring intégrité (anti-fraude wallet/insurance) |

**Total** : 8 fichiers, ~2 250 lignes spec actionable.

## Diff vs autres packs PURAMA

| Aspect | SHANTI (wellness) | MUKTI (emotional) | KOSHA (financial) | ADYA (B2B) | SANGHA (community) | **YANA (mobility)** |
|---|---|---|---|---|---|---|
| UGC | ❌ | ⚠️ journal privé | ❌ | ❌ | ✅ forte | ⚠️ trips partagés (carpool) |
| Modération | minimale | privée | minimale | none | 3-layer | medium (carpool reviews) |
| Apple GL critique | 1.4.1 | 1.4.1 | 1.4.1 | 4.0 | 1.2 + 5.6 | **2.5.13 driving + 5.1.5 location** |
| Permissions critiques | push | push | push | none | UGC | **GPS background + accelerometer + gyro** |
| Risk scoring | none | none | trust score user | none | trust score | **driving score + anti-tampering** |
| Partenariats externes | none | thérapeutes | banques | Meta/Google/etc. | trusted flaggers | **assureurs + plateformes covoiturage** |
| Cadre légal spécifique | LCEN | LCEN + Privacy | DSP2 + ACPR | DPA B2B | DSA | **LOM 2019 + ACPR (insurance) + Code de la route** |
| Pricing | 9,99/19,99 | 9,99/49,99/99,99 | 9,99/4,99 IAP | 29/79/199 B2B | 9,99/19,99 | **9,99/49,99/99,99** (3 plans VITAE) |
| Wealth Engine | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

## Chemin critique YANA (timeline 10-14 semaines)

| Semaine | Action | Bottleneck |
|---|---|---|
| S1 | SASU activée → Stripe live KYC submit | Stripe 2-7j |
| S1 | Apple Developer Program (déjà actif SHANTI) | — |
| S1-2 | Google Play Console (déjà actif) | — |
| S2 | Beta closed iOS TestFlight + Android Internal | TestFlight stable 1 sem |
| S3 | Permissions geolocation background validées Apple/Google | Apple peut demander explication détaillée |
| S3-4 | Avocat assurance (DGCCRF + ACPR validation wording) | 1 500-3 000€ |
| S4 | Onboarding 1ère assurance partenaire (MAIF ou Direct Assurance) | 4-8 semaines négociation |
| S5-6 | Driving safety review Apple (GL 2.5.13) | Vidéo demo 60s + bloc Notes |
| S7 | Apple submit | 7-14j typique pour app sensor-heavy |
| S7 | Google Play submit | 1-7j |
| S8 | Approval iOS + Android | Si rejet, 1-2 sem fix |
| S9-12 | Insurance partners onboarding scale-up | Sales B2B2C |

## Décisions clés actées

### 1. Capacitor 8 (cohérent écosystème)
Driving features = sensor-heavy. Capacitor permet plugins natifs (Capacitor Geolocation, Capacitor Motion + custom Cordova plugin pour GPS background). MAJ critiques (e.g. fix anti-tampering) = live update 5 min sans re-submit store.

### 2. Pricing 9,99 / 49,99 / 99,99
Cohérent BRIEF VITAE §20 (3 plans de la série Mobilité). Plan Essentiel = scoring + écoconduite stats. Plan Infini = + carpool + insurance discount eligibility. Plan Légende = + family fleet management.

### 3. Stripe externe Reader pattern (Apple)
Pas de StoreKit (cohérent SHANTI/MUKTI/SANGHA). Bouton iOS neutre "Activer mon plan", lien Safari externe vers `yana.purama.dev/subscribe`.

### 4. Wealth Engine ON
50% pool users / 10% Asso PURAMA / 40% SASU. Pool users redistribué via :
- Graines pour conduite éco (réduction CO2 mesurée).
- Tirages mensuels Top conducteurs sécurité.
- Reward arbres plantés via Ecologi (déjà cité §10 architecture).

### 5. NAMA-PILOTE persona IA
Un coach IA qui parle à l'utilisateur avant/pendant/après chaque trajet. Sécurité routière + écoconduite + sagesse voyage. Voice-only mode pendant le trajet (Apple GL 2.5.13).

### 6. Pas de Watch initial (P8 optionnel futur)
Décision pour focus mobile + web. Apple Watch driving complications = roadmap 2027.

### 7. Pas d'OBD-II en MVP
80% du driving scoring est faisable avec accéléromètre + GPS + gyroscope. OBD-II dongles = niche power user → P7+.

## Risques majeurs identifiés

### R1 — Apple GL 2.5.13 (Apps for Use While Driving)
**Mitigation** :
- UI driving-mode = voice-only (boutons gros + commande vocale uniquement).
- Auto-lock écran > 5 secondes au démarrage trajet.
- Aucune notification push pendant trajet (silent mode auto).
- Démo vidéo 60s montrant driving-mode dans Bloc Notes Apple Review.

### R2 — Google Play Permissions sensibles
**Mitigation** :
- `ACCESS_BACKGROUND_LOCATION` = permission sensible (Google audit). Justification écrite dans Data Safety + déclaration Apple Privacy Manifest.
- Foreground service notification visible pendant tracking ("YANA enregistre votre trajet").

### R3 — Anti-tampering / fraude scoring
**Mitigation** :
- Document `ANTI_TAMPERING.md` détaillant heuristiques détection :
  - Vitesse instantanée incohérente (téléphone qui simule via GPS spoofer).
  - Capteurs incohérents entre eux (accéléromètre vs gyroscope vs GPS).
  - Changement device fingerprint (user qui change de tel pour reset score).
- Anomalies → soft-flag + review manuelle avant payout wallet.

### R4 — Cadre légal covoiturage
**Mitigation** :
- Document `CARPOOL_LEGAL.md` aligné loi LOM 2019.
- Plafond tarifaire = barème fiscal IK × distance (pas de profit pour conducteur).
- Pas de qualification "transporteur professionnel" (= éviter licence transport).
- Mention claire dans CGU + Privacy.

### R5 — Conformité ACPR si partenariat assureur
**Mitigation** :
- YANA ne vend PAS d'assurance directement. Reçoit des leads via partenaires assureurs.
- Leur intermédiation = leur propre licence ORIAS.
- Si évolution future (revente directe) : démarche ORIAS + ACPR (Tier 4 le plus simple = 6-12 mois).

### R6 — Données driving = sensibles RGPD
**Mitigation** :
- Localisation = données personnelles strictes RGPD art. 9 (sensibles si profilage).
- Consentement explicite + droit effacement + export complet.
- Hébergement EU obligatoire (Vercel Frankfurt + Supabase EU).
- DPO + AIPD (analyse d'impact RGPD) obligatoires si > 250 users actifs en France.

## Pré-requis actions Tissma physiques

- [ ] SASU PURAMA immatriculée
- [ ] Apple Developer Program activé (déjà fait SHANTI)
- [ ] Google Play Console activé (déjà fait SHANTI)
- [ ] Compte bancaire pro Qonto (lien Stripe payouts)
- [ ] CNI Tissma uploadé Onfido KYC Stripe
- [ ] Avocat business EU + spécialiste assurance (relire CGV + Privacy + ACPR + LOM 2019) — ~3 000€
- [ ] Onboarding 1er partenaire assureur (recommandé MAIF — mutuelle conducteurs, pas pure capital) — 4-8 semaines
- [ ] AIPD écrite + soumise CNIL (auto-déclaration si pas de risque élevé) — gratuit, 2-4 semaines

## Pré-requis dev (parallèle pendant que Tissma fait les actions physiques)

- [ ] Code YANA web stable 4+ semaines en prod
- [ ] Driving scoring algorithm validé (calibration sur 100+ trajets test)
- [ ] Anti-tampering heuristiques implémentées (`src/lib/tampering.ts`)
- [ ] CGV + Privacy + AIPD publiés
- [ ] Status page `status.yana.purama.dev`
- [ ] Sentry + BetterStack monitoring actifs
- [ ] 100% RLS sur `trips`, `trip_events`, `vehicles`, `carpools`, `fatigue_sessions`
- [ ] Background location permissions testées sur 5+ devices iOS + Android
- [ ] Apple driving-mode UI démontrée vidéo (60s)

## Meta : ce pack vs autres apps PURAMA

| Pack | Lignes | Caractéristique |
|---|---|---|
| MUKTI | 1 206 | Wellness emotional, journal privé |
| KOSHA | 1 776 | Financial, Treezor + RevenueCat |
| ADYA | 1 472 | B2B SaaS, DPA/SLA critiques |
| SANGHA | 2 717 | Community UGC, modération + drills |
| **YANA** | **~2 250** | **Mobility, sensors + insurance + carpool legal** |

YANA = premier pack PURAMA orienté **capteurs natifs + partenariats externes (assureurs)**. Réutilisable comme template pour futures apps mobilité (MOTO/SCOOTER/VELO/E-MOBILITÉ) et apps capteurs-heavy (sport, santé connectée).
