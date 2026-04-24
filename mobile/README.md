# YANA Mobile (Expo 54)

Application iOS + Android de YANA — Mobility Wellness.
Front-end natif qui complète `yana.purama.dev` (même backend Supabase + Stripe).

---

## Stack

- **Expo SDK** 54 (React 19.1, React Native 0.81.5, Hermes)
- **Navigation** : expo-router (file-based `app/`)
- **Styling** : NativeWind v4 + Tailwind 3.4 (tokens YANA dans `tailwind.config.js`)
- **State** : Zustand (léger, zéro provider)
- **Auth** : @supabase/supabase-js + SecureStore adapter (Keychain / EncryptedSharedPrefs)
- **Animation** : react-native-reanimated v4 + react-native-worklets
- **Bundle identifier** : `dev.purama.yana` (iOS + Android)
- **Deep link scheme** : `yana://` + universal links `https://yana.purama.dev`

---

## Démarrer en local

```bash
cd mobile
npm install --legacy-peer-deps

# iOS (nécessite Xcode)
npx expo start --ios

# Android (nécessite Android Studio ou device USB)
npx expo start --android

# Web preview (debug rapide)
npx expo start --web
```

`.env.local` est généré à partir des CREDENTIALS web (voir §17 CLAUDE.md).
Les vars `EXPO_PUBLIC_*` sont injectées au bundle à la compile-time.

---

## Structure

```
mobile/
├─ app/                          # Routes expo-router (file-based)
│  ├─ _layout.tsx                # Root Stack + AuthGate (redirect auto)
│  ├─ index.tsx                  # Spinner de sécurité (route racine)
│  ├─ (auth)/                    # Flow non authentifié
│  │  ├─ _layout.tsx
│  │  ├─ login.tsx
│  │  ├─ signup.tsx
│  │  └─ forgot.tsx
│  └─ (tabs)/                    # Flow authentifié (bottom tabs × 5)
│     ├─ _layout.tsx
│     ├─ dashboard.tsx           # Home avec points/level/streak/wallet
│     ├─ drive.tsx               # SAFE + GREEN DRIVE (tracking natif en P7.B)
│     ├─ carpool.tsx             # Mes réservations via yana.carpool_bookings
│     ├─ wallet.tsx              # Balance + 20 dernières transactions
│     └─ profile.tsx             # Avatar + stats + signOut
├─ src/
│  ├─ lib/
│  │  ├─ supabase.ts             # Client Supabase + SecureStore adapter
│  │  ├─ constants.ts            # APP_SLUG, BUNDLE_ID, STORAGE_KEYS, etc.
│  │  └─ theme.ts                # colors/radii/fib/phi/spring/typography
│  ├─ hooks/
│  │  ├─ useAuth.ts              # Session + user state (onAuthStateChange)
│  │  └─ useProfile.ts           # Fetch yana.profiles pour user courant
│  └─ components/
│     ├─ GlassCard.tsx           # Card glass réutilisable
│     ├─ PrimaryButton.tsx       # Bouton primary/secondary/ghost + loading
│     └─ AuthInput.tsx           # Input labellisé + erreur + focus state
├─ assets/                       # icon, splash, adaptive (remplacés en P7.B.6)
├─ app.json                      # Expo config complet (iOS + Android + plugins)
├─ eas.json                      # 3 profils build (development/preview/production)
├─ babel.config.js               # Expo + NativeWind + worklets (reanimated)
├─ metro.config.js               # NativeWind wrapper sur metro default
├─ tailwind.config.js            # Tokens YANA (accent primary/secondary/tertiary + fib)
├─ global.css                    # @tailwind base/components/utilities
└─ nativewind-env.d.ts           # Types className pour RN
```

---

## Feuille de route mobile

- **P7.A** ✅ (cette PR) — Foundation : scaffold Expo + auth flow + tabs × 5 + NativeWind + config
- **P7.B** — Features natives : tracking `expo-location` (fg+bg) + `expo-sensors` (accel/gyro),
  HealthKit + Health Connect, screen-time natif, Moto Mode UI, icônes Pollinations+sharp,
  deep links `.well-known` + `assetlinks.json`
- **P7.C** — Stores : Maestro 10 flows, `store.config.json` 16 langues, EAS build/submit,
  GitHub Actions `.eas/workflows/full-deploy.yaml`

---

## Smoke tests (P7.A)

```bash
# tsc strict — 0 erreur
npx tsc --noEmit

# Validation app.json
npx expo config --type public

# Export iOS (compilation Hermes complète)
npx expo export --platform ios --output-dir /tmp/yana-ios
# → ~4.38 MB .hbc bundle

# Export Android
npx expo export --platform android --output-dir /tmp/yana-android
```

Les exports produisent du bytecode Hermes directement installable sur device
via `eas build --profile development` (P7.C).

---

## Règles critiques (§16 CLAUDE.md)

- `Platform.OS === 'web'` pour toute API browser (localStorage, window, document)
- SecureStore iOS/Android est la seule source de vérité auth (pas AsyncStorage)
- Icônes Lucide natives (`lucide-react-native`) viendront en P7.B — pour A on
  utilise des glyphes Unicode qui rendent sur iOS SF + Android Noto
- Tous les textes affichés côté iOS doivent rester neutres (§23 CLAUDE.md) :
  "Continuer" / "Activer" jamais "S'abonner" / "Payer"

---

## Liens

- Web prod : https://yana.purama.dev
- Backend Supabase : https://auth.purama.dev (self-hosted VPS)
- Schema DB : `yana.*` (même qu'en web, isolation via `db.schema`)
- Team Expo : `puramapro-oss`
