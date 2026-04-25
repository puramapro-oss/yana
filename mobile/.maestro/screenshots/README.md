# YANA — Screenshots stores

5 screenshots clés à capturer pour App Store Connect + Play Console listing.

## Pré-requis (Tissma 1×)

```bash
# 1. Maestro CLI (Java 11+ requis)
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro --version

# 2. Sims iOS (Xcode → Simulator) ou device USB Android
```

## Capture par device

### Pixel 7 Android (1080 × 2400)

```bash
# Booter un émulateur Pixel 7 :
emulator -list-avds  # afficher les AVD installés
emulator -avd Pixel_7_API_35

# Installer le build EAS preview Android (depuis l'URL de build P7.C.5.2) :
adb install ~/Downloads/yana-preview.apk

# Capturer
cd mobile
npm run maestro:screenshots
# → .maestro/screenshots/output/Pixel_7_API_35/0X-*.png
```

### iPhone 6.7" sim (1290 × 2796) — Tissma post Apple Dev

```bash
# Xcode 15+ : créer "iPhone 14 Pro Max" sim
xcrun simctl boot "iPhone 14 Pro Max"

# Installer build EAS preview iOS (.app bundle, dispo après C5.2 iOS — P7.D)
xcrun simctl install booted ~/Downloads/yana-preview.app

cd mobile
npm run maestro:screenshots
# → .maestro/screenshots/output/iPhone_14_Pro_Max/*.png
```

### iPhone 5.5" sim (1242 × 2208) — Tissma post Apple Dev

```bash
xcrun simctl boot "iPhone 8 Plus"
xcrun simctl install booted ~/Downloads/yana-preview.app
cd mobile && npm run maestro:screenshots
```

### iPad 12.9" sim (2048 × 2732) — Tissma post Apple Dev

```bash
xcrun simctl boot "iPad Pro 13-inch"
xcrun simctl install booted ~/Downloads/yana-preview.app
cd mobile && npm run maestro:screenshots
```

## Upload aux stores

### Play Console
1. Listings → Main store listing → Phone screenshots → Upload 2-8 PNG
   depuis `.maestro/screenshots/output/Pixel_7_*/0[1-5]*.png`
2. Tablet screenshots → Upload depuis iPad sim si dispo

### App Store Connect (post Apple Dev)
1. App Store → iOS App → Screenshots
2. Upload séparé pour 6.7" / 5.5" / 12.9" (Apple exige les 3 minimum)
3. Order : 1-dashboard puis 2-drive-idle puis 3-drive-active puis 4-moto puis 5-wallet

## Statut P7.C.6.2 (cette session)

- [ ] Pixel 7 Android : **bloqué** — Maestro CLI pas installé localement +
      pas d'émulateur booted. À refaire dès que `eas build --profile preview
      --platform android` (P7.C.5.2) est terminé et que Tissma a installé
      l'APK sur un device/sim Android.
- [ ] iPhone 6.7" / 5.5" / iPad 12.9" : **bloqué** — Apple Developer Account
      en attente (24-48h post inscription), pas de build iOS dispo.

**Action concrète** : Tissma lance `npm run maestro:screenshots` sur Pixel 7
dès que l'APK preview est installé, puis sur les sims iOS post Apple Dev.
