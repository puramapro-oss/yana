# EAS Submit Android — étapes Tissma post-build

## État P7.C.6.3 (2026-04-25 session 16)

- ✅ EAS preview Android build #1 (`2d8afa52-...`) → ERRORED INSTALL_DEPENDENCIES
  (lockfile désync). Fix appliqué en commit `c8baeaf` (`.npmrc` legacy-peer-deps).
- 🟡 EAS preview Android build #2 (`7822118f-0ad1-497d-9f32-b8f98d792c9e`) →
  **IN_PROGRESS** au moment du commit. Status : https://expo.dev/accounts/purama/projects/yana/builds/7822118f-0ad1-497d-9f32-b8f98d792c9e
- ⏳ `eas submit` non lancé : nécessite `mobile/google-service-account.json`
  (gitignored) qui n'existe pas encore — Tissma le génère via les étapes 2
  de `GOOGLE_PLAY_SETUP.md` (compte service `eas-submit-yana`).

## Quand le build #2 est SUCCESS

```bash
# 1. Vérifier qu'il y a bien un AAB / APK :
cd mobile
source ../.env.local && export EXPO_TOKEN
npx eas build:view 7822118f-0ad1-497d-9f32-b8f98d792c9e --json | jq '.artifacts'

# 2. Suivre GOOGLE_PLAY_SETUP.md sections 1-2 (créer app + service account)

# 3. Placer le JSON dans mobile/google-service-account.json (gitignored)

# 4. Submit
npx eas submit --profile production --platform android --non-interactive
# → upload AAB vers Play Console internal testing track
```

## Si le build #2 ECHOUE encore

Vérifier les logs :
```bash
URL=$(npx eas build:view <BUILD_ID> --json | jq -r '.logFiles[3]')
curl -sS "$URL" | python3 -c "
import json, sys
for line in sys.stdin:
  try:
    d = json.loads(line.strip())
    if d.get('level',0) >= 40: print(d.get('phase',''), d.get('msg',''))
  except: pass
" | head -30
```

Causes connues :
- Lockfile désync → vérifier `mobile/.npmrc` contient `legacy-peer-deps=true`
- Plugin react-native-* config error → ouvrir issue avec extrait du log
- Gradle OOM → augmenter resourceClass dans `eas.json` (large/m-large)
