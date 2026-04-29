# YANA — Mobile Framework Decision

> **Décision actée : Capacitor 8 live WebView + plugins natifs sensors.**
> Cohérent SHANTI / MUKTI / NIDRA / SANGHA. Pas Expo (différence vs KOSHA).

## Contexte décisionnel

YANA = **app sensor-heavy** (GPS continu + accéléromètre + gyroscope + magnétomètre).
Critère décisif : **MAJ algorithme scoring doit être instantané** (calibration continue selon nouveaux data drivers).

## Pourquoi Capacitor (pas Expo)

### 1. MAJ scoring en 5 min vs 1-2h vs 7j

Le scoring driving algorithm évolue **chaque semaine** dans les premiers mois (calibration sur vrai data) :

| Scénario | Capacitor (live web) | Expo (OTA EAS) |
|---|---|---|
| Bug détecté score freinage trop sévère | Push code web → 5 min | EAS Update → 1-2h propagation |
| Ajustement coef CO2 selon nouvelle norme | Push code web → 5 min | EAS Update → 1-2h |
| Patch anti-tampering (nouveau spoofer GPS détecté) | Push code web → 5 min | Re-build + EAS Update → 1-2h |
| Ajout nouveau type véhicule (camion, bus) | Push code web → 5 min | OTA si UI seule, sinon re-submit 7j |

Pour un produit en **calibration active**, 5 min vs 1-2h fait la différence entre user content et user frustré.

### 2. Cohérence écosystème PURAMA

| App | Framework | Bundle |
|---|---|---|
| SHANTI | Capacitor 8 | dev.purama.shanti |
| MUKTI | Capacitor 8 | dev.purama.mukti |
| NIDRA | Capacitor 8 | dev.purama.nidra |
| SANGHA | Capacitor 8 | dev.purama.sangha |
| **YANA** | **Capacitor 8** | **dev.purama.yana** |
| KOSHA | Expo (IAP requis) | dev.purama.kosha |

### 3. Plugins natifs requis pour YANA

```typescript
// package.json (côté mobile)
{
  "dependencies": {
    "@capacitor/core": "^8.0.0",
    "@capacitor/ios": "^8.0.0",
    "@capacitor/android": "^8.0.0",
    "@capacitor/geolocation": "^8.0.0",      // GPS coords + watchPosition
    "@capacitor/motion": "^8.0.0",            // accelerometer + gyroscope
    "@capacitor-community/background-geolocation": "^1.0.0", // GPS background continu
    "@capacitor/network": "^8.0.0",           // détection offline pour queue trips
    "@capacitor/push-notifications": "^8.0.0",
    "@capacitor/haptics": "^8.0.0",
    "@capacitor/preferences": "^8.0.0",       // session persistence
    "@capacitor/camera": "^8.0.0",            // avatar + vehicle photo
    "@capacitor/share": "^8.0.0",             // partager trajets impressionnants
    "@capacitor/keyboard": "^8.0.0",
    "@capacitor/status-bar": "^8.0.0",
    "@capacitor/app": "^8.0.0",               // deep links
    "@capacitor/text-zoom": "^8.0.0",         // accessibility driving-mode
    "@capacitor/screen-orientation": "^8.0.0", // landscape pour driving
    "@capacitor-community/keep-awake": "^1.0.0" // pour driving-mode iOS/Android
  }
}
```

### 4. Background location strategy

**iOS** : 
- `Significant Location Changes` pour économie batterie quand stationnaire.
- `requestAlwaysAuthorization` first-use (modal de disclosure).
- Background location modes activé dans Info.plist.

**Android** :
- `ForegroundService` avec notification visible "Yana enregistre votre trajet".
- `ACCESS_BACKGROUND_LOCATION` permission demandée séparément Android 11+.

### 5. Driving-mode UI = WebView spécialisée

L'UI driving-mode est rendue par la WebView Capacitor (pas un composant natif). Avantages :
- Itération rapide design (CSS + animations).
- Voice commands via Web Speech API (cross-platform).
- AVSpeechSynthesizer (iOS) et TextToSpeech (Android) via plugin custom Cordova.

### 6. Coût Capacitor vs Expo

| Poste | Capacitor | Expo |
|---|---|---|
| Setup initial | 1-2h cohérent SHANTI template | 2-4h |
| EAS Build cloud | N/A | 99 $/mois prod plan |
| Maintenance double codebase | 0% (shared web) | 5-10% |
| MAJ scoring | live (5 min) | OTA (1-2h) |

## Capacitor config

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.purama.yana',
  appName: 'Yana',
  webDir: '.next',
  server: {
    url: process.env.NODE_ENV === 'production'
      ? 'https://yana.purama.dev'
      : 'http://localhost:3000',
    cleartext: false,
    iosScheme: 'https',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0A0F',
    overrideUserAgent: 'PuramaYanaApp/1.0 iOS',
  },
  android: {
    backgroundColor: '#0A0A0F',
    overrideUserAgent: 'PuramaYanaApp/1.0 Android',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0A0A0F',
    },
    BackgroundGeolocation: {
      // iOS-specific
      desiredAccuracy: 'highest',
      stationaryRadius: 50,
      distanceFilter: 50,
      stopTimeout: 5,
      // Android-specific
      foregroundService: true,
      foregroundServiceTitle: 'Yana enregistre votre trajet',
      foregroundServiceText: 'Mode driving actif',
      notificationIconColor: '#F97316',
    },
    Geolocation: {
      permissions: {
        ios: ['location'],
        android: ['location', 'background-location'],
      },
    },
  },
};

export default config;
```

## Native features justification (Apple GL 4.0)

| Feature native | Justification user-value |
|---|---|
| Core Location (GPS + background) | Tracking continu trajet pour scoring |
| Core Motion (Accéléromètre + Gyroscope) | Détection freinages, accélérations, virages, fatigue |
| Magnetometer | Direction trajet pour cohérence GPS |
| Significant Location Changes | Économie batterie quand stationnaire |
| Background Audio | NAMA-PILOTE coach voice pendant trajet |
| AVSpeechSynthesizer | Voice-only mode driving |
| Push Notifications (FCM/APNS) | Pré-trip alerts (météo, fatigue prédite) |
| Haptics | Feedback freinages mode entraînement |
| Siri Shortcuts | "Hey Siri, démarre un trajet Yana" |
| Universal Links | Deeplinks email/SMS |
| Camera | Avatar + vehicle photo |
| Network detection | Mode offline + queue trips upload |

## Driving-mode UI implementation

> Critical pour Apple GL 2.5.13. Voir `DRIVING_SAFETY_GUIDELINES.md` pour détails.

```typescript
// src/lib/driving-mode.ts
export class DrivingMode {
  private isActive = false;
  private audioCoachOnly = true;

  async activate() {
    this.isActive = true;
    
    // 1. Lock screen orientation landscape
    await ScreenOrientation.lock({ orientation: 'landscape' });
    
    // 2. Disable idle timer (keep screen on)
    await KeepAwake.keepAwake();
    
    // 3. Hide all notifications
    await PushNotifications.requestPermissions(); // already granted
    // Push will be silenced via app state "active" + custom logic
    
    // 4. Switch UI to driving-mode component
    document.body.classList.add('driving-mode');
    
    // 5. Disable all touch except #end-trip-fullscreen-button
    document.body.style.pointerEvents = 'none';
    document.getElementById('end-trip-fullscreen-button')!.style.pointerEvents = 'auto';
    
    // 6. Start voice coach
    await this.speak('Bonjour. Trajet démarré. Je veille avec toi.');
  }

  async deactivate() {
    this.isActive = false;
    await ScreenOrientation.unlock();
    await KeepAwake.allowSleep();
    document.body.classList.remove('driving-mode');
    document.body.style.pointerEvents = '';
  }

  async speak(text: string) {
    // iOS uses AVSpeechSynthesizer, Android uses TextToSpeech
    // Both wrapped in custom Cordova plugin "tts-plugin"
    if (this.isActive && this.audioCoachOnly) {
      await TtsPlugin.speak({ text, language: 'fr-FR', rate: 0.9 });
    }
  }
}
```

## OTA strategy (live update sans re-submission)

> Capacitor + Next.js → toute MAJ web déployée sur Vercel = live mobile en 5 min.

### Limites OTA

- ❌ Pas de MAJ native shell (plugins, permissions, splash) → re-build + re-submit nécessaire.
- ✅ Toute logique JS/TS, UI, scoring algorithm, NAMA-PILOTE prompts, anti-tampering rules → live.

### Process MAJ critique

```bash
# Bug détecté score freinage (e.g. trop sévère sur petites villes)
git push  # → Vercel deploys → live in 5 min on web AND mobile WebView

# Ajout nouveau plugin native (rare, e.g. CarPlay v1.1)
fastlane ios beta
fastlane android internal
# → If ok: fastlane ios release / android production
```

## Pré-requis avant submit stores

- [ ] Capacitor 8 installé + configuré
- [ ] iOS workspace créé (`npx cap add ios`)
- [ ] Android workspace créé (`npx cap add android`)
- [ ] BackgroundGeolocation plugin configuré + testé
- [ ] Driving-mode UI testée sur 5+ devices iOS + Android
- [ ] Voice coach (AVSpeechSynthesizer + TextToSpeech) testé en français + anglais
- [ ] Splash screen design (palette YANA orange + bleu)
- [ ] App icon design 1024×1024
- [ ] Push notifications testées (FCM iOS via APNS sandbox + production)
- [ ] Universal Links testées (`apple-app-site-association` + `assetlinks.json`)
- [ ] Anti-tampering tested with GPS spoofer (jailbreak / Cydia)
- [ ] TestFlight stable 60 min sans crash

## Coût mobile YANA

| Poste | Coût annuel |
|---|---|
| Apple Developer Program | 99 $ (déjà payé écosystème) |
| Google Play Console | 0 $ (déjà payé) |
| EAS Build | 0 € (Capacitor pas besoin) |
| Sentry mobile | inclus plan SHANTI |
| Push notifications (FCM) | 0 € (gratuit Google) |
| Background location compute (battery considérations) | 0 € (sur device) |
| Custom Cordova plugins (TTS, anti-tampering) | 0 € (open-source) |
| **Total** | **~99 $/an** |

## TL;DR

> YANA mobile = Capacitor 8 + plugins natifs sensors (Geolocation, Motion, BackgroundGeolocation).
> Critère décisif : MAJ scoring algorithm en 5 min vs 1-2h Expo.
> Native features Apple GL 4.0 : 12 listées (largement assez pour passer GL 4.0 review).
> Background location strategy = Significant Location Changes iOS + ForegroundService Android.
> Driving-mode UI = WebView spécialisée (pas natif), avec voice-only via AVSpeechSynthesizer/TextToSpeech.
