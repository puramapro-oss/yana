# YANA — Google Play Setup (Tissma checklist 3 min)

Document à suivre **1 seule fois** pour publier YANA Android sur Play Console.
Toutes les étapes manuelles côté Tissma sont listées ; l'EAS submit
automatique en P7.C.6.3 reprendra le relais ensuite.

**Pré-requis** :
- Compte Google Play Developer ($25 one-shot, déjà payé d'après §17 CLAUDE.md)
- Accès au compte `puramapro-oss` Google Cloud

---

## 1. Créer l'app sur Play Console (~1 min)

1. https://play.google.com/console/u/0/developers/app/list
2. Bouton **Create app** (en haut à droite)
3. Renseigner :
   - **App name** : `YANA — Mobility Wellness`
   - **Default language** : Français (France)
   - **App or game** : App
   - **Free or paid** : Free (les abonnements Premium se font via le site web `yana.purama.dev/subscribe`, pas via Play Billing)
   - **Declarations** :
     - [x] Developer Program Policies
     - [x] US export laws
4. Bouton **Create app**

À la fin de cette étape, tu obtiens un **packageName** que tu vérifies être
exactement `dev.purama.yana` (sinon arrête tout et corrige `mobile/app.json`).

---

## 2. Service account Google Cloud (~1 min)

1. https://console.cloud.google.com/iam-admin/serviceaccounts?project=api-puramapro
   (créer le projet `api-puramapro` si absent — bouton **Create Project**)
2. Bouton **Create service account**
3. Renseigner :
   - **Service account name** : `eas-submit-yana`
   - **Service account ID** : `eas-submit-yana` (auto-généré)
   - **Description** : `EAS Submit YANA mobile to Play Console internal track`
4. **Grant access** :
   - Role 1 : **Service Account User**
   - Role 2 : **Service Account Token Creator**
5. **Done** → cliquer sur le compte créé → onglet **Keys** → **Add key** → **Create new key** → JSON
6. Télécharger le fichier → **renommer** en `google-service-account.json` →
   placer dans `mobile/google-service-account.json` (déjà dans `.gitignore`,
   ne JAMAIS commit)

Lier le service account à Play Console :
1. Retour dans Play Console → **Setup** → **API access**
2. Trouver le service account `eas-submit-yana@api-puramapro.iam.gserviceaccount.com`
3. **Grant access** → permissions :
   - **Releases** : Production / Internal testing → toutes options ON
   - **Store presence** : Store listing / Pricing & distribution → toutes ON
4. **Apply** puis **Send invite** → confirmer dans le mail de service account

---

## 3. App signing setup (~30 sec)

EAS génère automatiquement la **upload key** la 1ère fois que tu lances
`eas build --profile production --platform android` (P7.C.5.2). Aucune
étape manuelle ici **sauf** :

1. Dans Play Console → **App signing**
2. Choisir **Use Play App Signing** (Google gère la clé de release)
3. Cocher **I want Play to upload my app signing key** (continuité +
   rotation automatique en cas de fuite)

À l'upload du 1er AAB (étape 6), Play extrait la SHA-256 de la upload key
EAS et l'affiche dans **App signing → Upload key certificate → SHA-256**.

⚠ **C'est cette SHA-256 qu'il faut copier** dans
`public/.well-known/assetlinks.json` (placeholder
`TO_FILL_AFTER_EAS_BUILD_P7C_PLAY_UPLOAD_KEY_SHA256`).

---

## 4. Internal testing track (~30 sec)

1. **Testing → Internal testing**
2. **Create new release**
3. Track interne pour 1-100 testeurs Google Group ou liste d'emails.
4. **Add testers** → email de Tissma + 2 autres comptes test.
5. Lien d'opt-in à transmettre aux testeurs (auto-généré).

---

## 5. Privacy form + content rating (~1 min)

1. **Policy → App content** → remplir :
   - **Privacy policy** : `https://yana.purama.dev/politique-confidentialite`
   - **Ads** : Mon app ne contient pas de publicités
   - **App access** : Toutes les fonctionnalités sont accessibles sans
     identifiants spéciaux (compte démo `yana-review@purama.dev` /
     `DemoPwd2026!`)
   - **Content rating** : remplir le questionnaire IARC → Lifestyle →
     Tous publics (pas de violence, pas de contenu sensible)
   - **Target audience** : 18+ (pour cohérence avec assurance auto/moto)
   - **News app** : Non
   - **COVID-19 contact tracing** : Non
   - **Data safety** : voir section 6 ci-dessous

---

## 6. Data safety (~1 min)

YANA collecte les données suivantes — déclarer dans Play Console :

| Catégorie | Donnée | Collectée ? | Partagée ? | Optionnelle ? | Pourquoi |
|---|---|---|---|---|---|
| Localisation | Localisation précise | Oui | Non | Non | Tracker SAFE & GREEN trajets |
| Localisation | Localisation approximative | Oui | Non | Oui | Géohash trajet (privacy) |
| Personnal info | Email | Oui | Non | Non | Auth |
| Personnal info | Nom | Oui | Non | Oui | Profil utilisateur |
| Health & fitness | Heart rate | Oui | Non | Oui | NAMA fatigue (HealthKit/Health Connect) |
| Health & fitness | Sleep | Oui | Non | Oui | NAMA fatigue |
| App activity | App interactions | Oui | Non | Oui | No-Phone-While-Driving (AppState) |
| Device IDs | Push token | Oui | Non | Non | Notifications fatigue/trajet |
| Financial info | Aucune | — | — | — | Stripe Web hors-app |

Tout chiffré au repos (Supabase) + en transit (HTTPS).

---

## 7. Listing visuel (Tissma manuel ou EAS metadata:push C6.3)

Après le 1er build (P7.C.5.2) :

- **Feature graphic** 1024×500 : `mobile/assets/feature-graphic.png`
  (généré via `node scripts/gen-icons.mjs`, P7.B.6)
- **App icon** 512×512 : extrait de `mobile/assets/icon.png`
- **Screenshots phone** (min 2, max 8) : `mobile/.maestro/screenshots/output/pixel7/*.png`
  (généré via `npm run maestro:screenshots`, P7.C.6.2)
- **Listing texts** : auto via `eas metadata:push` (lit `mobile/store.config.json`)

---

## 8. Récupérer la SHA-256 Play Upload Key (post-build, ~10 sec)

Une fois le 1er AAB uploadé via `eas submit --platform android` :

```bash
# Méthode A — via Play Console UI :
# Setup → App signing → Upload key certificate → SHA-256 fingerprint

# Méthode B — via EAS (plus fiable) :
cd mobile
eas credentials --platform android --non-interactive
# → afficher "Upload Keystore" → "SHA256 Fingerprint of upload certificate"
```

Copier la SHA-256 (format `XX:XX:...:XX`, 64 hex chars séparés par `:`) puis
remplacer le placeholder dans `public/.well-known/assetlinks.json` :

```bash
# Depuis la racine du repo
sed -i '' 's|TO_FILL_AFTER_EAS_BUILD_P7C_PLAY_UPLOAD_KEY_SHA256|<SHA256 réelle>|' \
  public/.well-known/assetlinks.json

git add public/.well-known/assetlinks.json
git commit -m "fix(yana): P7.C.5.3 — assetlinks.json SHA-256 Play Upload Key"
git push origin main

# Redeploy Vercel pour que assetlinks.json soit servi avec la nouvelle SHA :
source .env.local && vercel --prod --token "$VERCEL_TOKEN" --yes
```

Test final :
```bash
curl -s https://yana.purama.dev/.well-known/assetlinks.json | jq '.[0].target.sha256_cert_fingerprints[0]'
# Doit retourner la nouvelle SHA, pas le placeholder.
```

---

## 9. Submit interne (auto via EAS — P7.C.6.3)

```bash
cd mobile
eas submit --profile production --platform android --non-interactive
# → upload AAB de eas build vers Play Console internal track
# → testeurs reçoivent l'invitation auto
```

---

## ✅ Done quand…

- [ ] App créée sur Play Console avec packageName `dev.purama.yana`
- [ ] Service account `eas-submit-yana` créé + permissions Releases/Store
- [ ] `mobile/google-service-account.json` téléchargé (gitignored)
- [ ] App signing → Use Play App Signing activé
- [ ] Internal testing track créé + 1 testeur ajouté
- [ ] Privacy form + content rating + data safety remplis
- [ ] 1er AAB uploadé via `eas submit`
- [ ] SHA-256 Play Upload Key copiée dans `assetlinks.json` + redeploy
- [ ] Universal links Android validés via `curl https://yana.purama.dev/.well-known/assetlinks.json`

Si bloqué : ouvrir issue avec tag `play-console` sur https://github.com/puramapro-oss/yana/issues
