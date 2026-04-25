# /.well-known/ — YANA universal & app links

Ce dossier est servi tel quel par Next.js à la racine de `https://yana.purama.dev/.well-known/`.
Les fichiers ici sont lus par iOS et Android pour associer le domaine web à
l'application mobile (deep linking "universal links" / "app links").

## Fichiers

### `apple-app-site-association` (JSON sans extension)
Consommé par iOS dès que l'app est installée. Apple télécharge ce fichier
depuis `https://yana.purama.dev/.well-known/apple-app-site-association` lors
de la première ouverture de l'app et chaque mise à jour.

## ⏳ EN ATTENTE — Apple Team ID (à compléter par Tissma)

Tissma a souscrit l'Apple Developer Program (validation 24-48h).
Une fois le compte actif :

```bash
# 1. Créer / récupérer le Team ID
#    App Store Connect → Membership → Team ID (10 chars, ex: 9Y8N2LCW8R)

# 2. Ré-ajouter le bloc submit.production.ios dans mobile/eas.json :
#    {
#      "submit": {
#        "production": {
#          "ios": {
#            "appleId": "matiss.frasne@gmail.com",
#            "ascAppId": "<App Store Connect ID, depuis App Store Connect → Apps → YANA>",
#            "appleTeamId": "<Team ID 10 chars>"
#          },
#          "android": { ... }
#        }
#      }
#    }

# 3. Remplacer le placeholder dans apple-app-site-association :
sed -i '' 's|TO_FILL_AFTER_EAS_BUILD_P7C|<TEAM_ID>|' \
  public/.well-known/apple-app-site-association

# 4. Commit + push + redeploy Vercel :
git add mobile/eas.json public/.well-known/apple-app-site-association
git commit -m "fix(yana): P7.C iOS Team ID + apple-app-site-association final"
git push origin main
source .env.local && vercel --prod --token "$VERCEL_TOKEN" --yes

# 5. Test final :
curl -s https://yana.purama.dev/.well-known/apple-app-site-association | \
  jq '.applinks.details[0].appID'
# Doit retourner "<TEAM_ID>.dev.purama.yana" — pas le placeholder.
```

Test de validité :
```bash
curl -sI https://yana.purama.dev/.well-known/apple-app-site-association
# Attendu : HTTP/2 200 + Content-Type: application/json
```

### `assetlinks.json`
Consommé par Android dès que l'app déclare `android:autoVerify="true"` dans
son intent filter (c'est notre cas, cf. `mobile/app.json`). Android 12+ vérifie
automatiquement la correspondance au premier lancement.

**SHA-256 active** (P7.C.5.3, 2026-04-25) :
`EA:D0:30:C3:D8:66:76:BA:2C:64:1F:6E:57:96:BB:C8:8A:FC:1E:B6:3A:08:FC:5A:87:9A:4D:06:9D:AF:F5:60`

C'est la **Upload Key EAS** (Build Credentials 2_vAHRB4W_ par défaut). Tant
que l'app n'est pas uploadée sur Play Console + Play App Signing activé,
cette même clé sert pour le sideload (APK preview). Une fois Play prend la
main sur la signing key (post 1er upload), il faudra ajouter une **2ème
SHA-256** dans le tableau `sha256_cert_fingerprints` (Play génère sa propre
release key, distincte de la upload key — les 2 doivent être présentes).

Récupération de la 2ème SHA-256 (post upload Play) :
```bash
# Via Play Console
# Setup → App signing → App signing key certificate → SHA-256

# OU via EAS
cd mobile && npx eas credentials --platform android
# Choisir "App-specific credentials" → "Show all credentials"
```

Format attendu : 32 paires hex séparées par `:`, en MAJUSCULES.

## Rôle côté app mobile

`mobile/app.json` déclare :
- iOS : `associatedDomains: ["applinks:yana.purama.dev", "applinks:purama.dev"]`
- Android : `intentFilters` avec `android:autoVerify="true"` pour `yana.purama.dev`

Ces fichiers côté web + ces déclarations côté app permettent aux URLs
`https://yana.purama.dev/activate?token=…` d'ouvrir **directement** l'app
installée (au lieu du site web). Le handler JS côté mobile est dans
`mobile/app/_layout.tsx` (listener `Linking.addEventListener('url')`).

## Paths couverts

| Path | Usage |
|---|---|
| `/activate*` | Retour Stripe après abonnement → app ouvre /wallet + toast |
| `/trip/:id` | Partage de trajet / deep link depuis email |
| `/moto*` | Lancement direct Moto Mode depuis widget ou raccourci |
| `/wallet*` | Lien "Voir ton wallet" depuis email/push |
| `/subscribe*` | Retour Stripe Portal → reprise subscription |
| `/drive*` | Deep link vers tab Drive |
