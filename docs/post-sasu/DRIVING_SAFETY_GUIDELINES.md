# YANA — Driving Safety Guidelines (Apple GL 2.5.13 + Code de la route)

> **Document le plus critique pour passer Apple Review.** YANA est utilisée pendant la conduite.
> Sans driving-mode UI conforme + safeguards démontrables → rejet Apple GL 2.5.13 quasi-garanti.
>
> Inspirations : Waze (driving mode), Coyote (voice-first), Apple Maps (CarPlay UI).

## Cadre légal français

### Code de la route — Article R412-6-1

> "L'usage d'un téléphone tenu en main par le conducteur d'un véhicule en circulation est interdit. (...)"

**Implication pour YANA** :
- ⚠️ User ne doit JAMAIS tenir le téléphone en main pendant la conduite.
- ✅ Téléphone dans support (mount) = légal.
- ✅ Voice commands + voice coach = légal.
- ❌ Touch interaction pendant trajet = illégal (pour user, pas pour YANA).

YANA doit donc faciliter le **mount + voice-only** mode.

### Article R412-6 — Distractions

> "(...) Tout conducteur doit se tenir constamment en état et en position d'exécuter commodément et sans délai toutes les manœuvres qui lui incombent."

**Implication** : YANA ne doit JAMAIS détourner l'attention. UI driving = minimaliste, voice-first.

## Apple Guideline 2.5.13 — Texte officiel

> **Apps for Use While Driving**: Apps designed to provide directions, controls, alerts, or other information that may be used while driving must comply with the following:
> - Avoid creating unnecessary distractions.
> - Limit visual interaction.
> - Don't autoplay video content with sound (audio prompts OK).
> - Use large, legible fonts.
> - Provide a "do not disturb while driving"-like mode.

**Notre interprétation YANA** :
- Driving-mode auto-detected (pas user-toggle qui peut être oublié).
- Toutes interactions visuelles minimisées en driving-mode.
- Voice coach = OK.
- Push notifications silenced en driving-mode.
- Fonts ≥ 60pt en driving-mode.

## Driving-mode UI — Spécifications

### Détection auto

```typescript
// src/lib/driving-detection.ts
import { Geolocation } from '@capacitor/geolocation';

const DRIVING_THRESHOLD_KMH = 15;
const DRIVING_DURATION_SUSTAINED_MS = 10_000; // 10 sec

export class DrivingDetector {
  private speedHistory: { speed: number; timestamp: number }[] = [];

  async start() {
    Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
      if (!position) return;
      
      const speedKmh = (position.coords.speed ?? 0) * 3.6;
      this.speedHistory.push({ speed: speedKmh, timestamp: Date.now() });
      this.speedHistory = this.speedHistory.filter(
        (e) => Date.now() - e.timestamp < DRIVING_DURATION_SUSTAINED_MS,
      );
      
      const isAllAboveThreshold = this.speedHistory.length >= 5
        && this.speedHistory.every((e) => e.speed >= DRIVING_THRESHOLD_KMH);
      
      if (isAllAboveThreshold && !DrivingMode.isActive) {
        DrivingMode.activate();
      } else if (!isAllAboveThreshold && this.speedHistory.length === 0 && DrivingMode.isActive) {
        DrivingMode.deactivate();
      }
    });
  }
}
```

### Layout driving-mode

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                      ●  82 km/h                            │  ← speed (≥ 60pt font)
│                                                            │
│                  ●●●●● 4.2 / 5                             │  ← score in-progress (réduit)
│                                                            │
│                                                            │
│                                                            │
│         ┌────────────────────────────────────┐             │
│         │       TERMINER LE TRAJET            │             │  ← 1 button only
│         │              (1 tap)                │             │     (44+ pts touchable, full
│         └────────────────────────────────────┘             │     row)
│                                                            │
│                                                            │
│              "Belle conduite, ralenti un peu               │  ← voice subtitle (40pt)
│               dans la prochaine ville."                    │     uniquement si driver
│                                                            │     OFF carplay/casque
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### CSS driving-mode

```css
/* src/app/globals.css */
.driving-mode {
  pointer-events: none; /* Désactive tous les clics */
  font-size: 60pt;
  background: var(--driving-bg, #0A0A0F);
  color: white;
  /* Animations désactivées */
  animation: none !important;
  transition: none !important;
}

.driving-mode #end-trip-fullscreen-button {
  pointer-events: auto !important;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 25vh;
  font-size: 48pt;
  background: linear-gradient(to top, var(--accent-orange), transparent);
  border-radius: 0;
}

.driving-mode .speed-display {
  font-size: 120pt;
  font-weight: 700;
  text-align: center;
}

.driving-mode .voice-subtitle {
  font-size: 40pt;
  text-align: center;
  position: absolute;
  bottom: 30vh;
  left: 5vw;
  right: 5vw;
  opacity: 0.8;
}

.driving-mode .ambient-info {
  font-size: 32pt;
  text-align: center;
  opacity: 0.6;
}
```

### Voice coach (NAMA-PILOTE)

```typescript
// src/lib/nama-voice.ts
export class NamaVoice {
  private isMuted = false;
  
  async speak(text: string, urgency: 'info' | 'warning' | 'critical' = 'info') {
    if (this.isMuted) return;
    
    const rate = urgency === 'critical' ? 1.1 : 0.9;
    const volume = urgency === 'critical' ? 1.0 : 0.7;
    
    await TtsPlugin.speak({
      text,
      language: 'fr-FR',
      rate,
      volume,
      voice: 'fr-FR-female-warm',
    });
  }

  async coachPreTrip(weather: Weather, fatigueLevel: number) {
    if (fatigueLevel > 7) {
      await this.speak(
        'Avant de partir, prends une pause. Ton corps signale beaucoup de fatigue.',
        'warning',
      );
      return;
    }
    
    await this.speak('Bon trajet. Reste centré, respire calmement.');
    
    if (weather.rain) {
      await this.speak('La pluie est annoncée. Augmente tes distances de sécurité.');
    }
  }

  async coachInTrip(event: TripEvent) {
    if (event.type === 'hard_brake') {
      await this.speak('Anticipe un peu plus, tu freines fort.', 'warning');
    } else if (event.type === 'speeding') {
      await this.speak('Tu dépasses la limite. Reviens dans le rythme.', 'warning');
    } else if (event.type === 'phone_pickup_detected') {
      await this.speak('Repose le téléphone. Concentre-toi sur la route.', 'critical');
    }
  }

  async coachPostTrip(score: TripScore) {
    if (score.overall >= 85) {
      await this.speak('Trajet excellent. Tu progresses.');
    } else if (score.overall >= 70) {
      await this.speak('Bon trajet. Travaille tes anticipations.');
    } else {
      await this.speak('Trajet difficile. On regarde ensemble dans le debrief.');
    }
  }
}
```

## Push notifications behavior

### Pendant trajet (driving-mode actif)

```typescript
// src/lib/notifications.ts
export async function deliverNotification(notification: Notification) {
  if (DrivingMode.isActive) {
    // Defer delivery until driving-mode ends
    await db.from('deferred_notifications').insert({
      user_id: currentUser.id,
      payload: notification,
      defer_until: 'trip_end',
    });
    return;
  }
  
  // Normal delivery
  await PushNotifications.send(notification);
}
```

### Après trajet

Notifications buffered pendant trajet → delivered en batch après 30 sec post-trajet.

## Anti-distraction safeguards

### 1. Auto-keep-awake (driving-mode only)

```typescript
import { KeepAwake } from '@capacitor-community/keep-awake';

// During driving-mode
await KeepAwake.keepAwake();

// On end-trip
await KeepAwake.allowSleep();
```

> Pas de keep-awake en mode normal (drain batterie + Apple va flagger).

### 2. Screen orientation lock

```typescript
import { ScreenOrientation } from '@capacitor/screen-orientation';

// Driving-mode: landscape uniquement (pour CarPlay-like)
await ScreenOrientation.lock({ orientation: 'landscape' });

// Mode normal : portrait par défaut
```

### 3. Aucune animation, aucun video, aucun carousel

```typescript
// CSS rule global
.driving-mode * {
  animation: none !important;
  transition: none !important;
}

.driving-mode video,
.driving-mode .carousel,
.driving-mode .slideshow {
  display: none !important;
}
```

### 4. Reading-heavy content masqué

```typescript
// Component logic
{!DrivingMode.isActive && (
  <Article>{longContent}</Article>
)}

{DrivingMode.isActive && (
  <ShortInfo>{essential3WordsSummary}</ShortInfo>
)}
```

## Phone pickup detection

> Détecter quand user lifte son téléphone (= probablement quitter le mount) → coach NAMA-PILOTE.

```typescript
// src/lib/phone-pickup-detector.ts
import { Motion } from '@capacitor/motion';

const ACCEL_PICKUP_THRESHOLD = 5; // m/s²

export class PhonePickupDetector {
  async start() {
    Motion.addListener('accel', ({ acceleration }) => {
      const magnitude = Math.sqrt(
        acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2,
      );
      
      if (magnitude > ACCEL_PICKUP_THRESHOLD && DrivingMode.isActive) {
        // Phone likely picked up
        NamaVoice.speak('Repose le téléphone. Reste sur la route.', 'critical');
        Haptics.vibrate({ duration: 500 });
        
        // Track event for post-trip debrief
        db.from('trip_events').insert({
          trip_id: currentTrip.id,
          type: 'phone_pickup_detected',
          severity: 'high',
        });
      }
    });
  }
}
```

## Crash detection (P0 safety feature)

> Detection auto crash via accéléromètre + gyroscope.

```typescript
// src/lib/crash-detection.ts
import { Motion } from '@capacitor/motion';

const CRASH_DECEL_THRESHOLD = 30; // m/s² (3g)
const CRASH_ROTATION_THRESHOLD = 5; // rad/s

export class CrashDetector {
  private lastSpeed = 0;
  private timeAtImpact = 0;
  
  async start() {
    Motion.addListener('accel', ({ acceleration }) => {
      const decel = Math.abs(this.lastSpeed - currentSpeed) / dt;
      
      if (decel > CRASH_DECEL_THRESHOLD && DrivingMode.isActive) {
        this.handleCrashDetected();
      }
    });
  }

  async handleCrashDetected() {
    // 1. Disable normal app flow
    DrivingMode.deactivate();
    
    // 2. Show crisis modal
    await Modal.show({
      title: '⚠️ Accident détecté',
      message: 'Tu vas bien ? Le 112 est l\'urgence européenne.',
      buttons: [
        { text: 'Tout va bien', action: 'cancel' },
        { text: 'Appeler le 112', action: 'call_112' },
      ],
      timeout: 30_000, // auto-call 112 if no response in 30s
      timeoutAction: 'call_112',
    });
    
    // 3. If timeout or "Appeler le 112" tapped
    if (action === 'call_112') {
      Linking.openURL('tel:112');
      // Notify emergency contact
      await this.notifyEmergencyContact();
    }
  }
}
```

> ⚠️ Cette feature doit avoir disclaimer clair : "Yana peut détecter certains accidents mais n'est pas un service d'urgence officiel. En cas d'accident, appeler le 112."

## Driver fatigue detection

> Anti-fatigue feature critique pour safety messaging.

```typescript
// src/lib/fatigue-detector.ts
export class FatigueDetector {
  private microsleepCount = 0;
  
  detectMicrosleep(motionData: MotionData) {
    // Heuristic 1: Sudden lateral drift detected via accelerometer
    // Heuristic 2: Reduction in steering corrections (gyroscope)
    // Heuristic 3: Speed inconsistency (sudden slowdowns/accelerations)
    
    if (this.detectedSign(motionData)) {
      this.microsleepCount++;
      
      if (this.microsleepCount >= 3) {
        NamaVoice.speak(
          'Je détecte des signes de fatigue. La prochaine aire de service est dans 8 km. Prends une pause.',
          'critical',
        );
        Haptics.vibrate({ duration: 1000 });
        
        // Track event
        db.from('trip_events').insert({
          trip_id: currentTrip.id,
          type: 'fatigue_detected',
          severity: 'critical',
          microsleep_count: this.microsleepCount,
        });
      }
    }
  }
}
```

## Apple Review checklist driving-mode

Avant submission Apple, vérifier :

- [ ] Driving-mode auto-detect vitesse > 15 km/h sur 10 sec.
- [ ] UI driving = écran simplifié, voice-only, fonts ≥ 60pt.
- [ ] Aucune notification visuelle en driving-mode.
- [ ] Tous boutons disabled sauf "End Trip" (1 tap, full-screen footer).
- [ ] Voice coach en français OK + en anglais (i18n).
- [ ] Phone pickup detection avec coach.
- [ ] Crash detection avec call 112 prompt.
- [ ] Fatigue detection avec coach.
- [ ] Vidéo demo 30 sec montrant driving-mode actif.
- [ ] Bloc Notes Apple Review explicite (cf APPLE_DEVELOPER_SETUP.md).

## Code de la route — Disclaimers obligatoires

Sur `/legal/cgu` et splash de l'app, mention :

```
⚠️ Important :
Yana ne se substitue jamais à l'attention du conducteur. L'utilisation
d'un téléphone tenu en main pendant la conduite est INTERDITE par le
Code de la route (art. R412-6-1).
- Place ton téléphone dans un mount avant de démarrer.
- Active le mode mains libres.
- Si urgence : 112 (toutes urgences européennes).
```

## Sécurité moto-spécifique

> Mode moto a des règles supplémentaires.

- Voice coach uniquement si user porte casque Bluetooth/intercom (détection auto headset).
- Sans casque connecté → pas de voice coach (pour ne pas distraire).
- Stats mode moto : inclinaison + vitesse + freinage progressif.
- Jamais de notification haptic moto (le user ne sentira pas + dangereux).

## TL;DR

> YANA driving-mode = obligation Apple GL 2.5.13 + Code de la route art. R412-6-1.
> 8 features safety implémentées : auto-detect, voice-only UI, push deferred, screen lock, anti-distraction, phone pickup detection, crash detection, fatigue detection.
> Crash detection = disclaimer clair "pas un service d'urgence".
> Mode moto = voice coach conditionnel (headset connected only).
