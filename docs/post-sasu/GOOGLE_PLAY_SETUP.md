# YANA — Google Play Console setup

> Pré-requis : Google Play Console activé pour PURAMA SASU. Service Account JSON déjà généré (réutilisable depuis SHANTI).

## Spécificité YANA vs autres apps PURAMA

Google est plus permissif qu'Apple sur driving-mode UI, **mais** plus strict sur permissions sensibles et Data Safety :

- **`ACCESS_BACKGROUND_LOCATION`** = permission "sensitive" → audit Google obligatoire si ciblage > Android 11.
- **`FOREGROUND_SERVICE_LOCATION`** (Android 14+) = obligatoire si tracking continu.
- **Data Safety form** : précision sur location data + retention period.
- **Health Connect / Fitness API** : non utilisé (pas Health App).
- **Auto & Vehicles category** : Google a sa propre catégorie pour mobilité.

## ① Création de l'app

URL : Console → All apps → "Create app".

| Champ | Valeur |
|---|---|
| App name | `Yana — Conduire avec sagesse` |
| Default language | French (France) |
| App or game | App |
| Free or paid | **Free** |
| Package name | `dev.purama.yana` |

## ② Initial declarations

| Question | Réponse |
|---|---|
| Submitting on behalf of organization? | ✅ Yes (PURAMA SASU) |
| Will this app contain ads? | **No** |
| App for or about children? | **No** (18+) |

## ③ Categorisation

URL : Main store listing → Categorisation.

| Champ | Valeur |
|---|---|
| Application category | **Auto & Vehicles** |
| Tags | `Driving`, `Eco-driving`, `Carpool`, `Fuel saving`, `Motorcycle` |

> Auto & Vehicles = catégorie dédiée. Pas Travel & Local (trop générique).

## ④ Target audience

URL : Policy → App content → Target audience.

| Champ | Valeur |
|---|---|
| Target age groups | **18 and over** |
| Are children part of audience? | No |
| Will you appeal to children? | No |
| Have you read Families Policy? | ✅ |

## ⑤ Content rating IARC

URL : Policy → App content → Content rating → Start questionnaire.

| Question | Réponse |
|---|---|
| Email | dev@purama.dev |
| App category | **Reference, News, Educational** |
| Violence | None |
| Sexuality | None |
| Language | None |
| Controlled substance | None |
| Gambling | None |
| Mature/Suggestive themes | None |
| User interaction | ✅ Yes (carpool reviews + chat opt-in) |
| Personal info shared | ✅ Yes (driving data with insurance opt-in) |
| Digital purchases | No (Stripe externe) |
| Location sharing | ✅ Yes (background GPS) |
| Unrestricted internet | No |

**Résultats attendus** :
- ESRB : `Everyone`
- PEGI : `3`
- USK : `0`
- IARC global : `Everyone`

## ⑥ Data Safety form

URL : Policy → App content → Data safety.

> **Critique pour YANA**. Google audit régulièrement les apps location-heavy.

### Data collection

| Type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| **Personal info** |  |  |  |  |
| Name | ✅ | ❌ | Optional | Account |
| Email | ✅ | ❌ | Required | Account |
| User ID | ✅ | ❌ | Required | App functionality |
| Phone (OTP) | ✅ | ❌ | Optional | Verification |
| **Location** |  |  |  |  |
| Approximate location | ✅ | **opt-in only** to insurance partners | Required | App functionality |
| Precise location | ✅ | **opt-in only** | Required | App functionality (driving score) |
| **Financial info** |  |  |  |  |
| (Subscription tier) | ✅ | ❌ | Required | App functionality |
| Payment cards | ❌ (handled by Stripe directly) |  |  |  |
| **Health & fitness** | ❌ (we don't do health) |  |  |  |
| **Messages** |  |  |  |  |
| (Carpool messages) | ✅ | ❌ | Optional | App functionality, moderation |
| **Photos & videos** |  |  |  |  |
| Photos (avatar, vehicle) | ✅ | ❌ | Optional | App functionality |
| **App activity** |  |  |  |  |
| Driving stats (sensor data) | ✅ | **opt-in only** | Required | App functionality |
| App interactions | ✅ | ❌ | Optional | Analytics |
| Other user-generated content (carpool reviews) | ✅ | ❌ | Optional | App functionality |
| **Device or other IDs** |  |  |  |  |
| Device IDs (FCM) | ✅ | ❌ | Required | Push notifications |

### Security practices

| Question | Réponse |
|---|---|
| Encrypted in transit | ✅ TLS 1.3 |
| Can request data deletion | ✅ `/profile/privacy/delete` |
| Independently validated | ❌ (audit roadmap) |
| Committed to Google Play Families Policy | N/A (18+) |

### Data sharing detail

> ⚠️ **Sharing avec assureurs** = uniquement **opt-in séparé**.
>
> Section "Data sharing" :
> - "Driving stats" — Shared with: **Insurance partners**, **but only if user explicitly opts in** in Settings > Insurance Discount Eligibility.
> - Mention "User retains right to revoke at any time."

## ⑦ COVID-19 / Health declarations

| Question | Réponse |
|---|---|
| COVID contact tracing | No |
| Health-related functionality | **No** |

> Anti-fatigue = pas "health" au sens Google (pas de diagnostic, pas de medical advice).

## ⑧ Financial features

| Question | Réponse |
|---|---|
| Financial services | No |
| Personal loans | No |
| Cryptocurrency | No |
| Insurance | **No** (pas de vente directe — uniquement leads opt-in) |

> Si activation directe revente assurance future → cocher **Yes** + ORIAS license.

## ⑨ Government identification

| Question | Réponse |
|---|---|
| Government IDs collected | No |

> Permis de conduire = juste demandé en bio optionnelle, jamais vérifié officiellement (pas de OCR).

## ⑩ Permissions

URL : Policy → App content → Permissions Declaration.

### Permissions sensibles à justifier

| Permission | Justification (≤500 chars) |
|---|---|
| `ACCESS_FINE_LOCATION` | Compute precise driving score: GPS + accelerometer + gyroscope must align for accurate scoring. Coarse location insufficient (city-level not enough for braking/acceleration analysis). User can opt out anytime. |
| `ACCESS_BACKGROUND_LOCATION` | Trips last 30-60 minutes. Driving score requires continuous GPS sampling for the entire trip. Without background, we lose 99% of trip data. User explicitly consents at first use, can revoke anytime. Foreground service notification visible during tracking. |
| `FOREGROUND_SERVICE` | Notification "Yana enregistre votre trajet" visible during active trips. Required Android 8+. |
| `FOREGROUND_SERVICE_LOCATION` | Required Android 14+ for location-based foreground services. |
| `ACTIVITY_RECOGNITION` | Detect when user is driving vs walking vs cycling. Critical to auto-start trip and avoid false positives. |
| `BODY_SENSORS` (optional) | NOT used in v1. Future use for fatigue detection via heart rate variability. |
| `INTERNET` | Network access for app functionality |
| `CAMERA` (optional) | Avatar + vehicle photo (optional) |
| `RECORD_AUDIO` (optional) | Voice commands "Hey Yana, start trip" (optional) |
| `POST_NOTIFICATIONS` (Android 13+) | Push notifications for trip alerts |

### Permissions NOT needed (ne pas déclarer)

- ❌ `READ_PHONE_STATE`
- ❌ `READ_CONTACTS`
- ❌ `BLUETOOTH` (pas en MVP, OBD-II reporté à v1.1+)
- ❌ `BLUETOOTH_CONNECT`
- ❌ `WRITE_EXTERNAL_STORAGE`

## ⑪ Store listing

| Champ | Valeur |
|---|---|
| App name | `Yana — Conduire avec sagesse` |
| Short description (≤80) | `Coach éco-conduite & sécurité routière. Score, trajets, anti-fatigue.` |
| Full description (≤4000) | (cf APPLE_DEVELOPER_SETUP.md, identique) |

### Graphics

| Asset | Format |
|---|---|
| App icon | 512×512 PNG (palette YANA orange + bleu + violet éveil) |
| Feature graphic | 1024×500 PNG (route stylisée + véhicule abstrait + tagline) |
| Phone screenshots | 1080×1920 (8 max) |
| Tablet screenshots (10") | 1920×1200 (8 max) |

### Translations

> 16 langues PURAMA. v1.0 = FR + EN + DE + ES + IT (Europe driving). v1.1 = +PT, NL, PL, etc.

## ⑫ App releases — Strategy

```
Internal testing (5 conducteurs PURAMA team)        [Day 1]
    ↓
Closed testing (50 beta drivers — voiture + moto)   [Day 7]
    ↓
Closed testing extended 14j (collect score data)    [Day 21]
    ↓
Production (release direct si Closed OK)            [Day 28]
```

> Closed Testing **2 semaines obligatoire** pour calibrer le scoring algorithm sur du vrai data driving + détecter les bugs sensor.

## ⑬ App Signing

URL : Setup → App integrity.

| Choix | Recommandé |
|---|---|
| Use Play App Signing | ✅ Yes |
| Upload key | Generate via keytool |

```bash
keytool -genkey -v -keystore yana-upload-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias yana-upload \
  -dname "CN=PURAMA SASU, OU=YANA, O=PURAMA, L=Frasne, S=Bourgogne, C=FR"
```

## ⑭ App Links

`public/.well-known/assetlinks.json` :

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "dev.purama.yana",
      "sha256_cert_fingerprints": [
        "<SHA-256 upload key>",
        "<SHA-256 Google Play app signing key>"
      ]
    }
  }
]
```

## ⑮ Comments aux reviewers Google

> Reprendre Bloc Notes Apple (cf APPLE_DEVELOPER_SETUP.md) en adaptant :
> - Pas de Guideline 2.5.13 (Google n'a pas d'équivalent strict driving-mode).
> - Mais : Google peut auditer les permissions sensibles → expliquer pourquoi `ACCESS_BACKGROUND_LOCATION` est nécessaire.
> - Mentionner Android Auto compatibility (v1.1 roadmap).

## ⑯ Auto-detection driving (Activity Recognition)

> Android Activity Recognition Client + ActivityTransitionRequest.

```typescript
// Pseudo-code
const transitions = [
  { activityType: ActivityType.IN_VEHICLE, transitionType: TransitionType.ENTER },
  { activityType: ActivityType.IN_VEHICLE, transitionType: TransitionType.EXIT },
];

await ActivityRecognitionClient.requestActivityTransitionUpdates(transitions);
// On ENTER → propose user to start tracking (don't auto-start to respect consent)
// On EXIT → end trip auto if was tracking
```

## ⑰ Pré-requis avant submission Google

- [ ] Web prod YANA stable 4+ semaines.
- [ ] Driving scoring testé sur Android 12 / 13 / 14.
- [ ] Background location testée sur Pixel + Samsung + Xiaomi (gestionnaire batterie aggressifs).
- [ ] Foreground service notification visible et discrète.
- [ ] Closed Testing 14 jours avec 50+ vrais drivers.
- [ ] AIPD CNIL déposée (groupé avec dépôt Apple).
- [ ] Service Account JSON dans GitHub Actions secrets.

## ⑱ Pipeline fastlane

```ruby
# fastlane/Fastfile (extrait Android)
platform :android do
  lane :internal do
    upload_to_play_store(
      track: 'internal',
      aab: '../android/app/build/outputs/bundle/release/app-release.aab',
      json_key: ENV['GOOGLE_SERVICE_ACCOUNT_JSON_PATH'],
      package_name: 'dev.purama.yana',
      release_status: 'completed'
    )
  end

  lane :closed do
    upload_to_play_store(
      track: 'production',
      track_promote_to: nil,
      aab: '../android/app/build/outputs/bundle/release/app-release.aab',
      json_key: ENV['GOOGLE_SERVICE_ACCOUNT_JSON_PATH'],
      package_name: 'dev.purama.yana',
      release_status: 'inProgress',
      rollout: '0.05'
    )
  end

  lane :production do
    upload_to_play_store(
      track: 'production',
      aab: '../android/app/build/outputs/bundle/release/app-release.aab',
      json_key: ENV['GOOGLE_SERVICE_ACCOUNT_JSON_PATH'],
      package_name: 'dev.purama.yana',
      release_status: 'completed',
      rollout: '1.0'
    )
  end
end
```

## ⑲ Smoke post-publication

```bash
curl -sI "https://play.google.com/store/apps/details?id=dev.purama.yana" | head -1

# Digital Asset Links
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yana.purama.dev&relation=delegate_permission/common.handle_all_urls"
```

## ⑳ Plan en cas de rejet

| Raison rejet | Action |
|---|---|
| Sensitive permission `ACCESS_BACKGROUND_LOCATION` insuffisamment justifiée | Compléter Permissions Declaration form + screenshot first-use disclosure modal |
| Data Safety form incomplete | Re-remplir avec audit interne |
| User Generated Content policy | Renforcer carpool review moderation flow |
| Foreground service notification absente | Vérifier `Notification.Builder` apparaît bien pendant tracking |

## ㉑ Coût total Google YANA

| Poste | Coût |
|---|---|
| Google Play Console | 0 $ (déjà payé) |
| Submission délai Internal | 1-2h |
| Submission délai Production | 1-7j |
| Nombre soumissions attendu | 1-2 |

## TL;DR

Google Play YANA = Data Safety form précis + permissions sensibles bien justifiées + 14j Closed Testing minimum. Plus simple qu'Apple GL 2.5.13. Bottleneck = audit `ACCESS_BACKGROUND_LOCATION` (peut prendre 1-2 semaines additionnelles).
