# /.well-known/ — YANA universal & app links

Ce dossier est servi tel quel par Next.js à la racine de `https://yana.purama.dev/.well-known/`.
Les fichiers ici sont lus par iOS et Android pour associer le domaine web à
l'application mobile (deep linking "universal links" / "app links").

## Fichiers

### `apple-app-site-association` (JSON sans extension)
Consommé par iOS dès que l'app est installée. Apple télécharge ce fichier
depuis `https://yana.purama.dev/.well-known/apple-app-site-association` lors
de la première ouverture de l'app et chaque mise à jour.

**À finaliser en P7.C** : remplacer `TO_FILL_AFTER_EAS_BUILD_P7C` par le
**Apple Team ID** (10 caractères, ex: `9Y8N2LCW8R`). Le Team ID est visible
dans App Store Connect → *Membership* → *Team ID*.

Après le premier `eas build --profile production --platform ios`, le Team ID
est affiché dans les logs de build et dans `eas.json` une fois configuré.

Test de validité :
```bash
curl -sI https://yana.purama.dev/.well-known/apple-app-site-association
# Attendu : HTTP/2 200 + Content-Type: application/json
```

### `assetlinks.json`
Consommé par Android dès que l'app déclare `android:autoVerify="true"` dans
son intent filter (c'est notre cas, cf. `mobile/app.json`). Android 12+ vérifie
automatiquement la correspondance au premier lancement.

**À finaliser en P7.C** : remplacer le fingerprint par le
**SHA-256 de la Play Upload Key**. Récupérable via :
```bash
keytool -list -v -keystore ~/.android/debug.keystore   # pour tests locaux
# ou via Play Console → Setup → App signing → App signing key certificate
```

Astuce : pour Expo + EAS, après le 1er build Android, récupérer via :
```bash
eas credentials --platform android
# Puis copier le "SHA-256 Fingerprint of app signing certificate"
```

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
