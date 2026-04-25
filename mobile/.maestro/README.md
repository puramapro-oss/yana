# YANA — Maestro E2E flows

10 flows YAML couvrant les parcours critiques de YANA mobile (iOS + Android).
Chaque flow est isolé : il commence par `launchApp` + clear state pour ne dépendre
d'aucun état antérieur.

## Pré-requis

```bash
# Installer Maestro localement (1×, hors repo)
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro --version  # ≥ 1.40

# iOS : nécessite Xcode + simulateur démarré
# Android : nécessite Android Studio + emulator OU device USB en mode debug
```

## Lint syntaxique (pas besoin de Maestro CLI)

```bash
cd mobile
npm run maestro:lint
# → vérifie chaque .yaml parsable + collecte testIDs absents du code
```

CI peut lancer ce lint sans installer Maestro (zéro Java requis).

## Lancer les flows

```bash
# Tous les flows (séquentiel)
cd mobile
npm run maestro:test

# 1 seul flow
npx maestro test .maestro/flows/flow-02-login-email.yaml

# Avec compte test custom
MAESTRO_USERNAME=foo@bar.com MAESTRO_PASSWORD=Sup3r! \
  npx maestro test .maestro/flows/flow-02-login-email.yaml

# Mode debug visuel (logs détaillés + ralenti)
npx maestro test --debug-output /tmp/maestro-debug .maestro/flows/flow-04-drive-start-stop.yaml
```

## Comptes test

Maestro lit `MAESTRO_USERNAME` / `MAESTRO_PASSWORD` depuis l'environnement.
Par défaut (config.yaml) : `yana-maestro@purama.dev` / `DemoPwd2026!`.

**À créer manuellement 1× sur prod** (Tissma — flag P7.C) :
1. https://yana.purama.dev/signup
2. Email `yana-maestro@purama.dev`, password `DemoPwd2026!`
3. Confirmer email puis ajouter 1 véhicule "Tesla Model 3" comme primary
4. Ce compte sert UNIQUEMENT aux tests E2E — ne pas l'utiliser ailleurs.

## Liste des flows

| # | Fichier | Couvre |
|---|---|---|
| 01 | `flow-01-signup-email.yaml` | Inscription email → toast confirm |
| 02 | `flow-02-login-email.yaml` | Login valide → tabs |
| 03 | `flow-03-login-error.yaml` | Creds invalides → message FR |
| 04 | `flow-04-drive-start-stop.yaml` | Sélection véhicule → start → live → stop → score |
| 05 | `flow-05-drive-cancel.yaml` | Start → cancel → retour idle |
| 06 | `flow-06-moto-mode.yaml` | Activer Moto Mode → 3 boutons → exit |
| 07 | `flow-07-fatigue-modal.yaml` | Mock fatigue level≥2 → modal → cancel |
| 08 | `flow-08-wallet-history.yaml` | Tab Wallet → solde + 1 txn |
| 09 | `flow-09-deep-link-activate.yaml` | yana://activate → toast + onglet Wallet |
| 10 | `flow-10-profile-signout.yaml` | Toggle no-phone + signout → login |

## Screenshots

Sous-dossier `.maestro/screenshots/`.
Voir `flow-screenshots.yaml` (P7.C.6.1) pour la capture des 5 vues clés.
Tailles requises (Apple Connect / Play Console) :
- iPhone 6.7" : 1290 × 2796 (iPhone 14/15 Pro Max)
- iPhone 5.5" : 1242 × 2208 (iPhone 8 Plus)
- iPad 12.9" : 2048 × 2732 (iPad Pro 6th gen)
- Android : 1080 × 2400 (Pixel 7)

## CI

Les flows tournent **localement avant chaque release** par Tissma. Maestro Cloud
(payant) est une option future — non requis pour les premiers builds EAS.

## i18n re-translate (Tissma — quand crédits Anthropic dispo)

Le 1er run `node scripts/i18n-store-translate.mjs` (P7.C.2.3, 2026-04-25) a
échoué avec `HTTP 401 invalid x-api-key` sur la clé `.env.local` puis
`credit balance is too low` sur la clé globale CLAUDE.md → 14 locales Apple
+ 15 locales Android sont en **fallback EN** (marker `_fallback` dans
chaque entrée du `mobile/store.config.json`).

Pour re-traduire correctement :
```bash
# 1. Renouveler ANTHROPIC_API_KEY dans .env.local (key avec crédits)
# 2. Vider les fallbacks pour forcer la re-traduction
node -e "
const fs = require('fs')
const c = JSON.parse(fs.readFileSync('mobile/store.config.json'))
for (const k of Object.keys(c.apple.info)) if (c.apple.info[k]._fallback) delete c.apple.info[k]
for (const k of Object.keys(c.android.info)) if (c.android.info[k]._fallback) delete c.android.info[k]
fs.writeFileSync('mobile/store.config.json', JSON.stringify(c, null, 2) + '\n')
"
# 3. Re-run le script (idempotent — il skip fr-FR/en-US déjà figés)
node scripts/i18n-store-translate.mjs
# 4. Vérifier qu'aucun _fallback ne reste
grep -c "_fallback" mobile/store.config.json  # doit retourner 0
```

## Smoke checklist post-P7.C (Tissma — 1× après EAS build)

Lors du 1er EAS dev build sur device physique :

- [ ] Installer Maestro : `curl -Ls "https://get.maestro.mobile.dev" | bash`
- [ ] Vérifier Java : `java -version` (Java 11+ requis)
- [ ] Booter sim iOS ou device USB Android
- [ ] `cd mobile && npm run maestro:test` (run all 10 flows)
- [ ] Si flow échoue : capturer logs + screenshot + ouvrir issue avec tag `maestro`
- [ ] Si tous OK : commit le rapport + commenter sur dernier commit P7.C
