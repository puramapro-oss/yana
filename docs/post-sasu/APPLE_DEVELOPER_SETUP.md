# YANA — Apple App Store Connect setup

> Pré-requis : Apple Developer Program activé pour PURAMA SASU (D-U-N-S déjà obtenu pour SHANTI).
> Si pas encore : suivre `/Users/matissdornier/purama/shanti/docs/post-sasu/APPLE_DEVELOPER_SETUP.md`.

## Spécificité YANA vs autres apps PURAMA

YANA est la **1ère app PURAMA orientée mobilité/voiture/moto**. Profil de review Apple atypique :

- **Guideline 2.5.13 (Apps for Use While Driving)** : Apple impose driving-mode UI strict (voice-only, gros boutons, auto-lock écran). **Critère #1**.
- **Guideline 5.1.5 (Location Services)** : background location = justification écrite + consentement explicite + désactivation aisée.
- **Guideline 5.1.1 (Data Collection)** : trajets = données personnelles sensibles RGPD.
- **Guideline 4.0 (Minimum Functionality)** : sensor-heavy app = facile à justifier (accéléromètre + GPS + gyro = 5+ features natives).
- **Guideline 1.4.1 (Health & Safety)** : si app déclare aider à la sécurité routière, disclaimer + redirection autorités obligatoires.

> Une demande YANA sans avoir verrouillé GL 2.5.13 + 5.1.5 = rejet quasi-garanti.

## ① Création de l'app

URL : https://appstoreconnect.apple.com/apps → "+" → New App.

| Champ | Valeur |
|---|---|
| Platforms | iOS |
| Name | `Yana — Conduire avec sagesse` (≤ 30 chars) |
| Primary Language | French |
| Bundle ID | `dev.purama.yana` |
| SKU | `yana-ios-2026` |

### Subtitle, Promotional text, Description

| Champ | Valeur |
|---|---|
| Subtitle (≤ 30 chars) | `Coach éco-conduite & sécurité` |
| Promotional Text (≤ 170 chars) | `Améliore ta conduite avec NAMA-PILOTE : score sécurité, économies carburant, anti-fatigue, covoiturage. Compatible voiture & moto.` |
| Keywords (≤ 100 chars) | `conduite,écoconduite,sécurité,trajet,covoiturage,moto,voiture,assurance,carburant,fatigue` |
| Support URL | `https://yana.purama.dev/aide` |
| Marketing URL | `https://yana.purama.dev` |
| Privacy Policy URL | `https://yana.purama.dev/legal/confidentialite` |
| EULA | Apple Standard EULA (suffit, pas d'UGC) |

### Description (≤ 4000 chars)

```
Yana est ton compagnon mobilité bienveillant. Que tu conduises une voiture
ou une moto, Yana t'aide à conduire mieux, économiser, et voyager plus
serein.

NAMA-PILOTE — TON COACH IA
Avant chaque trajet, NAMA-PILOTE te propose un mantra de conduite et
te rappelle les bonnes pratiques selon météo + heure + fatigue.
Pendant le trajet (mode mains libres uniquement), il analyse ta
conduite en temps réel : freinage, accélération, virages, vitesse.
Après le trajet, debrief audio personnalisé : ce qui était excellent,
ce qui peut s'améliorer.

SCORE DE CONDUITE 0-100
Calculé sur 5 dimensions :
🛡️ Sécurité (anticipation, distances, vitesse)
🌱 Écoconduite (consommation, émissions CO2)
🧘 Sérénité (douceur freinages/accélérations)
⏰ Vigilance (détection fatigue, micro-pauses)
📍 Trajet (efficacité itinéraire, embouteillages évités)

ÉCONOMIES MESURÉES
Yana calcule ton économie carburant chaque mois. Conduite éco = 15-25%
moins de consommation typique. Sur 1 an, ça représente 300-700€.

ANTI-FATIGUE
Détection automatique des signes de fatigue (mouvements imprévus,
microsommeils détectés via accéléromètre). Vibration douce + suggestion
pause. Sauve des vies.

COVOITURAGE BIENVEILLANT
Propose ou rejoins un covoiturage avec d'autres membres Yana. Tarif
encadré loi LOM 2019 (frais réels). Avis post-trajet bidirectionnels.

YANA POUR LA MOTO
Mode moto dédié : tracking inclinaison, freinage progressif, scan
trajectoires. Pas de notifications push pendant le trajet. Mantra
de protection au démarrage.

NAMA-PILOTE N'EST PAS :
- Un GPS de navigation (utilise Plans / Waze / Google Maps).
- Un radar communautaire (utilise Coyote / Waze).
- Un service d'urgence. En cas d'accident : 112.

ABONNEMENT
- Plan Essentiel : score + écoconduite stats + 1 véhicule (9,99€/mois).
- Plan Infini : + covoiturage + insurance discount + 5 véhicules
  (49,99€/mois).
- Plan Légende : + family fleet management + 10 véhicules + Concours
  Top conducteurs (99,99€/mois).
- Activation et tarifs sur yana.purama.dev (en dehors de l'app).

CONFIDENTIALITÉ & RGPD
- Hébergement européen (Vercel Frankfurt + Supabase EU).
- Données trajet conservées 1 an max (puis anonymisées).
- Suppression compte + données : 1 clic dans Profil > Confidentialité.
- AIPD réalisée et déposée à la CNIL.
- DPO : dpo@purama.dev.

NAMA-PILOTE
Notre IA est un coach bienveillant, pas un mouchard. Il ne signale rien
à personne. Il t'aide à grandir comme conducteur. C'est tout.

SUPPORT
support@purama.dev
9-19h heure de Paris, lundi au vendredi.

Yana est édité par PURAMA SASU, 8 Rue de la Chapelle, 25560 Frasne.
Conditions générales : yana.purama.dev/legal/cgu
```

## ② Categories

- **Primary** : `Travel`
- **Secondary** : `Lifestyle`

> Pas `Navigation` (Apple sera plus strict GPS) — on n'est pas un GPS, on est un coach. Pas `Health & Fitness` (déclencherait GL 1.4.1 stricte).

## ③ Age Rating — 4+

| Question | Réponse YANA |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content | None |
| Profanity | None |
| Alcohol, Tobacco, Drug | None |
| Mature Themes | None |
| Horror | None |
| Medical Info | None |
| Gambling | None |
| Unrestricted Web | No |
| User Generated Content | No (carpool reviews = optional, modérés) |
| Contests | None |

**Résultat** : `4+` (apps utilitaires).

## ④ App Privacy form

URL : App Information → App Privacy → Edit.

> ⚠️ Critique pour app sensor-heavy. Apple audit régulièrement.

| Catégorie | Collecté | Lié | Tracking |
|---|---|---|---|
| Email | ✅ | ✅ | ❌ |
| Name | ✅ | ✅ | ❌ |
| User ID | ✅ | ✅ | ❌ |
| Phone Number (OTP optionnel) | ✅ | ✅ | ❌ |
| **Location — Precise Location** | ✅ | ✅ | ❌ |
| **Location — Coarse Location** | ✅ | ✅ | ❌ |
| **Sensitive Info — Other** (driving score) | ✅ | ✅ | ❌ |
| User Content — Customer Support | ✅ | ✅ | ❌ |
| User Content — Other (carpool reviews) | ✅ | ✅ | ❌ |
| Identifiers — Device ID (FCM) | ✅ | ❌ | ❌ |
| Diagnostics — Crash Data (Sentry) | ✅ | ❌ | ❌ |
| Diagnostics — Performance (PostHog EU) | ✅ | ❌ | ❌ |
| Usage Data — Product Interaction (PostHog EU) | ✅ | ✅ | ❌ |
| **Other Data — Vehicle Info** (marque, modèle) | ✅ | ✅ | ❌ |

> ❌ AUCUN tracking ads (PURAMA n'a pas de pub).
> ❌ AUCUN partage avec assureurs sans consentement explicite (opt-in séparé).

### Purposes (à cocher)

- App Functionality : ✅ (toutes catégories)
- Analytics : ✅ (Diagnostics, Usage Data)
- Personalization : ✅ (NAMA-PILOTE adapt mantras au user)
- Third-Party Advertising : ❌
- Developer's Marketing : ❌
- Other Purposes : ❌

## ⑤ Pricing & Availability

| Champ | Valeur |
|---|---|
| Price | **Free** |
| Availability | EU + UK + Suisse + Canada (FR-speaking + RGPD-cohérent) |

> Pas de US/Asia en v1 : compliance routière US différente, IA NAMA-PILOTE en français only en v1.

## ⑥ Native Features (justifying GL 4.0)

> Apps mobilité = facile à justifier. Au moins 6 native features indispensables.

| Feature native | Justification user-value |
|---|---|
| Core Location (GPS background) | Tracking trajets pour scoring |
| Core Motion (Accéléromètre, Gyroscope) | Détection freinages, virages, fatigue |
| Magnetomètre | Direction trajet (cohérence avec GPS) |
| Significant Location Changes | Économie batterie quand stationnaire |
| Background Audio | NAMA-PILOTE voice coach pendant trajet |
| AVSpeechSynthesizer | Voice-only mode driving (pas de TTS Anthropic en background) |
| Push Notifications (FCM via APNS) | Alertes pré-trajet (météo, fatigue prédite) |
| Haptics | Feedback freinages mode entraînement |
| Siri Shortcuts | "Hey Siri, démarre un trajet Yana" |
| CarPlay (v1.1+) | Affichage compatible voiture |
| Universal Links | Email/SMS deeplinks vers trajets |

## ⑦ App Review Information

### Demo Account

```
Email: demo-yana@purama.dev
Password: YANA-demo-{YYYYMMDD}-{4lettres}

Demo includes:
- 3 véhicules pré-configurés (1 voiture Tesla Model 3, 1 moto Yamaha
  MT-07, 1 scooter Vespa).
- 50+ trajets simulés (variant scores et conditions).
- 1 covoiturage actif (proposition + booking demo).
- Score conducteur = 78/100 (réaliste, pas "perfect").
- Mode moto activé pour tester safety driving features.
```

### Notes (texte review)

```
ABOUT YANA

Yana is a mobility wellness app for drivers (cars, motorcycles, scooters).
It helps users drive safer, save fuel, detect fatigue, and carpool with
other Yana members.

CRITICAL — GUIDELINE 2.5.13 COMPLIANCE (USE WHILE DRIVING)

We acknowledge GL 2.5.13 means strict driving-mode UI requirements:

1. AUTO DRIVING-MODE DETECTION
   The app detects when the user is driving (speed > 15 km/h sustained)
   and automatically switches to driving-mode within 5 seconds.

2. DRIVING-MODE UI = VOICE-ONLY
   In driving mode:
   - Screen displays only essential info (current speed, score so far,
     trip duration) in EXTRA LARGE fonts (≥ 60pt).
   - All buttons hidden except a single full-screen "End Trip" button.
   - All taps disabled except "End Trip" (1 tap = entire screen).
   - Voice commands enabled via "Hey Yana" wake word.
   - NAMA-PILOTE coach speaks via AVSpeechSynthesizer (no TTS streaming).
   - All push notifications silenced (delivery deferred until trip ends).

3. AUTO LOCK SCREEN
   App requests "no idle timer" only for full driving mode where speed
   stays > 0. If car stops > 60 sec → screen sleeps as usual.

4. ANTI-DISTRACTION SAFEGUARDS
   - No video playback during driving mode.
   - No image carousels or animations beyond minimal speedometer.
   - No reading-heavy content (text limited to 3 short sentences max
     per voice intervention).

5. DEMO VIDEO ATTACHED
   30-second video showing user starting trip → driving-mode auto-engaged
   → only end-trip button visible → trip ends → full UI restored.

CRITICAL — GUIDELINE 5.1.5 COMPLIANCE (LOCATION)

1. WHY BACKGROUND LOCATION IS NECESSARY
   Driving score requires continuous GPS sampling (1 Hz minimum) for the
   entire trip duration. User starts trip, places phone in pocket / mount,
   drives for 30-60 minutes. Without background, we lose 99% of trips.

2. EXPLICIT CONSENT
   First-time use: full-screen disclosure modal explaining "Yana needs
   your background location for the entire trip duration to compute your
   driving score. We never share with third parties without your explicit
   opt-in. Tap to enable."

3. EASY OPT-OUT
   Settings > Privacy > Location toggle disables background tracking.
   Trips can still be manually logged but without auto scoring.

4. DATA MINIMIZATION
   - GPS coordinates rounded to 100m precision after trip ends.
   - Only retained 1 year (then anonymized).
   - User can export full GPS data anytime (RGPD art. 20 portability).
   - User can delete all GPS data 1-click.

NATIVE FEATURES (anti-wrapper Guideline 4.0)
- Core Location, Core Motion, Magnetometer
- Significant Location Changes (battery optimization)
- Background Audio (NAMA-PILOTE coach)
- AVSpeechSynthesizer (voice-only driving mode)
- Push Notifications (pre-trip alerts)
- Haptics (training mode feedback)
- Siri Shortcuts ("Hey Siri, start Yana trip")
- Universal Links

MONETIZATION (Apple-compliant Reader App)
- App is FREE on App Store.
- Subscriptions (9.99 / 49.99 / 99.99 €/month) sold via Stripe at
  https://yana.purama.dev/subscribe (external Safari).
- "Activate" button is neutral following Guideline 3.1.3(a) Reader App
  pattern, justified by ecosystem-wide subscription accessing web
  features and other PURAMA apps.

DATA & PRIVACY
- EU-hosted (Vercel Frankfurt + Supabase EU).
- GDPR-compliant. AIPD filed with CNIL.
- DPO: dpo@purama.dev.
- No advertising tracking. No IDFA.
- Insurance partners (MAIF/etc.) receive ANONYMIZED scoring summary
  ONLY when user explicitly opts in for "insurance discount eligibility".

NOT MEDICAL, NOT EMERGENCY
- We are not a medical app.
- In case of accident: 112 (emergency).
- In case of fatigue while driving: take a break NOW (we display
  this prominently if our system detects it).

CONTACT FOR REVIEW
Matiss Dornier (Founder, Lead)
dev@purama.dev / +33 X XX XX XX XX (sur demande)
9-19h Paris time, M-F.
```

### Attachments

- 30s video demo "driving-mode" (mp4, format Apple-compatible).
- Screenshot dashboard `/admin/safety` driving-mode test.
- AIPD CNIL (PDF déposé).

## ⑧ Anti-rejet patterns YANA

### GL 2.5.13 (Use While Driving)
**Risque** : highest pour cette app.
**Anticipation** : démo vidéo + bloc Notes ci-dessus + UI driving-mode démo en TestFlight.

### GL 5.1.5 (Location)
**Risque** : élevé (background location).
**Anticipation** : disclosure modal first-use + opt-out facile + data minimization documentée.

### GL 5.1.1 (Data Collection)
**Risque** : moyen-élevé (driving data = sensible).
**Anticipation** : App Privacy form complet + AIPD CNIL + opt-in séparé pour partage assureurs.

### GL 1.4.1 (Health & Safety)
**Risque** : moyen (anti-fatigue claim).
**Anticipation** : disclaimer "we are not medical" + redirect 112 si crash detected.

### GL 4.0 (Minimum Functionality)
**Risque** : faible (10+ native features).
**Anticipation** : liste exhaustive Bloc Notes.

### GL 3.1.3a (Reader App)
**Risque** : faible.
**Anticipation** : justification ecosystem PURAMA cohérente SHANTI/MUKTI/SANGHA.

## ⑨ Universal Links

`public/.well-known/apple-app-site-association` :

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABC123XYZ4.dev.purama.yana",
        "paths": [
          "/auth/callback",
          "/trips/*",
          "/vehicles/*",
          "/carpool/*",
          "/score/*",
          "/profile/*"
        ]
      }
    ]
  }
}
```

## ⑩ CarPlay (roadmap v1.1)

> Apple recommande CarPlay pour apps Travel (et obligatoire si on veut "Drive Mode" Apple natif).

Prérequis CarPlay :
1. CarPlay entitlement (demande à Apple, refus possible).
2. UI CarPlay-spécifique (limitée, voice-first).
3. Apple peut imposer review CarPlay séparée.

> Pour v1.0 → skip. Pour v1.1+ → demander entitlement + designer UI CarPlay.

## ⑪ Build pipeline

```bash
cp -R /Users/matissdornier/purama/shanti/fastlane /Users/matissdornier/purama/yana/fastlane

sed -i '' 's/dev.purama.shanti/dev.purama.yana/g' fastlane/*
sed -i '' 's/shanti.purama.dev/yana.purama.dev/g' fastlane/*
sed -i '' 's/Shanti/Yana/g' fastlane/*
sed -i '' 's/SHANTI/YANA/g' fastlane/*
```

App icon (1024×1024) : palette YANA orange `#F97316` + bleu `#0EA5E9` + accent éveil `#7C3AED`. Splash screen : logo discret + petit véhicule abstrait sur route stylisée géométrie sacrée.

## ⑫ Pré-requis avant submission

- [ ] Web prod YANA stable depuis 4+ semaines.
- [ ] Driving scoring algorithm calibré sur 100+ trajets test (voiture + moto).
- [ ] Mode driving UI testé sur iPhone SE (petit écran) + iPhone 15 Pro Max (grand).
- [ ] Anti-tampering heuristiques implémentées + testées avec GPS spoofer Cydia (jailbreak).
- [ ] AIPD CNIL déposée + accusé réception.
- [ ] Status page `status.yana.purama.dev`.
- [ ] Demo account avec données réalistes (pas perfect, score 78/100).
- [ ] Universal Links validés.
- [ ] TestFlight stable 2 semaines avec 5+ vrais conducteurs (cars + motos).
- [ ] Vidéo demo 30s + 60s prête.
- [ ] AVSpeechSynthesizer testé en français + multi-voix.

## ⑬ Smoke post-publication

```bash
APPLE_ID=<numeric_id>
curl -sI "https://apps.apple.com/fr/app/yana-conduire-avec-sagesse/id$APPLE_ID" | head -1
```

## ⑭ Plan en cas de rejet

| Raison | Action |
|---|---|
| GL 2.5.13 — driving-mode insuffisant | Renforcer Bloc Notes + ajouter screenshots dashboard `/admin/driving-mode-test` |
| GL 5.1.5 — location pas justifiée | Réécrire disclosure first-use plus explicite + démontrer opt-out 1-tap |
| GL 4.0 — wrapper | Ajouter Siri Shortcuts + démos vidéo natives features |
| GL 1.4.1 — claim médical | Adoucir "anti-fatigue" → "détection signes fatigue" + disclaimer renforcé |

## ⑮ Coût total Apple YANA

| Poste | Coût |
|---|---|
| Apple Developer Program | 99 $/an (déjà payé écosystème) |
| Avocat assurance + ACPR review | ~1 500 € (groupé avec ADYA possible) |
| Vidéo demo 60s pro | 200-500 € (Fiverr motion designer) ou DIY |
| Submission délai | 7-14j (sensor-heavy = review approfondie) |
| Nombre soumissions attendu | 2 (1 rejet typique GL 2.5.13, 1 approve) |

## TL;DR

YANA Apple = checklist GL 2.5.13 + 5.1.5 stricte. Si driving-mode UI démontrée + background location justifiée + AIPD CNIL déposée → approve attendu. Vidéo demo 30s + dashboard `/admin/driving-mode-test` = key proofs.
