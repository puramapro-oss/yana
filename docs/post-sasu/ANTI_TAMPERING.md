# YANA — Anti-Tampering (Risk Scoring Integrity)

> Heuristiques pour détecter la fraude au scoring driving. Critique car users motivés par :
> - Réductions assurance partenaires (gain financier direct).
> - Wallet redistribution Wealth Engine (gain financier graines).
> - Concours Top conducteurs Plan Légende (gain reconnaissance + prizes).
>
> Sans anti-tampering → arnaque massive en 30 jours.

## Vecteurs d'attaque connus

### V1 — GPS Spoofer

**Description** : User installe app GPS Spoofer (Cydia jailbreak iOS, Fake GPS Android root) et simule des trajets fictifs.

**Détection** :
- ❌ Mock location detected (Android `Location.isFromMockProvider()`).
- ❌ iOS jailbreak indicators (Cydia, /Applications/Cydia.app, ssh ports open).
- ❌ Vitesse instantanée > limite physique (> 250 km/h sustained = pas une voiture normale).
- ❌ Téléportation (changement coords > 1 km en 1 sec).

### V2 — Sensors mismatch

**Description** : User envoie des positions GPS perfect mais oublie de simuler les mouvements accéléromètre/gyroscope cohérents.

**Détection** :
- ❌ Pas de variation accéléromètre pendant trajet (téléphone immobile).
- ❌ Gyroscope flat (pas de virages mesurables).
- ❌ Magnetometer toujours pointant nord (téléphone posé sur table).

### V3 — Speed manipulation

**Description** : User script qui prétend rouler très lentement (= sécurité parfaite).

**Détection** :
- ❌ Vitesse moyenne < 5 km/h sur 30+ min (= marche, pas voiture).
- ❌ Cohérence trajet (un trajet à 5 km/h sur 50 km = 10h, pas crédible).

### V4 — Multi-device farming

**Description** : User a 5 téléphones, fait tourner YANA sur tous depuis sa voiture pour multiplier les graines wallet.

**Détection** :
- ❌ Plusieurs comptes YANA → même IP + même pattern trajet géographique → flag.
- ❌ Device fingerprint check : 5 devices distincts dans le même véhicule en 5 min = suspect.

### V5 — Account farming

**Description** : User crée 50 comptes pour chaque trajet, gagne 50× les graines wallet.

**Détection** :
- ❌ Email pattern (gmail+aliases : user+1@gmail.com, user+2@gmail.com).
- ❌ Téléphone OTP requis pour insurance opt-in (limite 1 user / téléphone).
- ❌ Stripe customer billing same → flag.

### V6 — Hardware emulator (Android)

**Description** : User lance YANA dans Android Studio emulator + script qui simule sensors + GPS.

**Détection** :
- ❌ Build.FINGERPRINT contient "generic" → emulator.
- ❌ android.os.Build.MODEL.contains("sdk_gphone") → emulator.
- ❌ Pas d'IMEI réel (pas accessible en emulator).
- ❌ SafetyNet API attestation (Google Play Integrity API).

### V7 — Friend trip sharing

**Description** : User a un ami qui conduit bien, lui donne son téléphone à chaque trajet pour gonfler son score.

**Détection (très difficile)** :
- ⚠️ Pattern detection : trajets toujours partis de la même adresse mais conducteur "X" varie.
- ⚠️ Photo selfie obligatoire pré-trajet (avec liveness check) — coût UX, à activer si abus détecté.

## Implementation YANA anti-tampering

### Layer 1 — Device check (signup + every session)

```typescript
// src/lib/tampering/device-check.ts
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';

export async function deviceIntegrityCheck(): Promise<{
  trustScore: number;
  flags: string[];
}> {
  const flags: string[] = [];
  let trustScore = 100;
  
  const info = await Device.getInfo();
  
  // Check 1: Emulator detection (Android)
  if (info.platform === 'android') {
    const isEmulator = 
      info.model.toLowerCase().includes('sdk_gphone') ||
      info.model.toLowerCase().includes('emulator') ||
      info.manufacturer.toLowerCase().includes('genymotion');
    
    if (isEmulator) {
      flags.push('android_emulator');
      trustScore -= 80;
    }
  }
  
  // Check 2: Jailbreak detection (iOS) - via custom Cordova plugin
  if (info.platform === 'ios') {
    const jailbroken = await JailbreakDetector.isJailbroken();
    if (jailbroken) {
      flags.push('ios_jailbroken');
      trustScore -= 60; // Less harsh than emulator
    }
  }
  
  // Check 3: Mock location (Android only)
  if (info.platform === 'android') {
    const mockLocation = await MockLocationDetector.isEnabled();
    if (mockLocation) {
      flags.push('mock_location_enabled');
      trustScore -= 70;
    }
  }
  
  // Check 4: Google Play Integrity (Android)
  if (info.platform === 'android') {
    const integrity = await PlayIntegrity.requestToken();
    if (!integrity.appRecognitionVerdict.includes('PLAY_RECOGNIZED')) {
      flags.push('not_play_recognized');
      trustScore -= 50;
    }
  }
  
  return { trustScore: Math.max(0, trustScore), flags };
}
```

### Layer 2 — Trip integrity check (during trip)

```typescript
// src/lib/tampering/trip-integrity.ts
export class TripIntegrityChecker {
  private trustScore = 100;
  private flags: string[] = [];
  
  async check(tripData: TripData): Promise<{ trustScore: number; flags: string[] }> {
    // Check 1: Speed sanity
    const maxSpeed = Math.max(...tripData.gpsPoints.map((p) => p.speed));
    if (maxSpeed > 250) {
      this.flags.push('speed_unrealistic');
      this.trustScore -= 50;
    }
    
    // Check 2: Sensor coherence
    const accelVariance = calculateVariance(tripData.accelerometer);
    if (accelVariance < 0.5 && tripData.duration > 60_000) {
      this.flags.push('accelerometer_too_static');
      this.trustScore -= 40;
    }
    
    // Check 3: Teleportation detection
    for (let i = 1; i < tripData.gpsPoints.length; i++) {
      const distance = haversine(tripData.gpsPoints[i - 1], tripData.gpsPoints[i]);
      const dt = (tripData.gpsPoints[i].timestamp - tripData.gpsPoints[i - 1].timestamp) / 1000;
      const speedKmh = (distance / 1000) / (dt / 3600);
      
      if (speedKmh > 300) {
        this.flags.push('teleportation_detected');
        this.trustScore -= 90;
        break;
      }
    }
    
    // Check 4: GPS jitter (too perfect = simulator)
    const jitterMean = calculateJitter(tripData.gpsPoints);
    if (jitterMean < 0.5 && tripData.duration > 300_000) {
      // < 0.5m jitter on 5+ min = suspicious (real GPS has 3-10m jitter)
      this.flags.push('gps_too_perfect');
      this.trustScore -= 30;
    }
    
    // Check 5: Acceleration physics
    const maxAccel = Math.max(...tripData.accelerometer.map((a) => Math.abs(a.x)));
    if (maxAccel > 12) {
      // > 1.2g lateral = pas réaliste pour voiture normale
      this.flags.push('acceleration_unrealistic');
      this.trustScore -= 60;
    }
    
    return { trustScore: this.trustScore, flags: this.flags };
  }
}

function haversine(p1: GpsPoint, p2: GpsPoint): number {
  // Standard Haversine formula
  const R = 6371000;
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateVariance(values: { x: number; y: number; z: number }[]): number {
  const magnitudes = values.map((v) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2));
  const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance = magnitudes.reduce((a, b) => a + (b - mean) ** 2, 0) / magnitudes.length;
  return variance;
}

function calculateJitter(points: GpsPoint[]): number {
  // Mean deviation from straight-line interpolation
  const deviations: number[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const expected = interpolate(points[i - 1], points[i + 1], points[i].timestamp);
    deviations.push(haversine(expected, points[i]));
  }
  return deviations.reduce((a, b) => a + b, 0) / deviations.length;
}
```

### Layer 3 — Account farming detection (background CRON)

```typescript
// src/app/api/cron/anti-farming/route.ts
export async function POST() {
  // Run hourly via Vercel Cron
  
  // Check 1: Multiple users with same IP in last 24h
  const { data: ipClusters } = await supabase.schema("yana").rpc("find_ip_clusters", {
    threshold: 5, // 5+ users from same IP = suspect
    window_hours: 24,
  });
  
  for (const cluster of ipClusters ?? []) {
    if (cluster.users.length >= 5) {
      // Flag all users in cluster
      await supabase.schema("yana").from("trust_flags").insert(
        cluster.users.map((userId: string) => ({
          user_id: userId,
          flag: 'ip_cluster_suspect',
          severity: 'medium',
          metadata: { cluster_size: cluster.users.length, ip: cluster.ip },
        })),
      );
    }
  }
  
  // Check 2: Email aliases pattern (gmail +)
  const { data: aliases } = await supabase
    .from("auth.users")
    .select("id, email")
    .like("email", "%+%@gmail.com");
  
  // Group by base email (before +)
  const grouped = groupBy(aliases, (u) => u.email.split('+')[0] + '@' + u.email.split('@')[1]);
  
  for (const [base, users] of Object.entries(grouped)) {
    if (users.length >= 3) {
      // 3+ aliases from same base = flag
      for (const user of users) {
        await supabase.schema("yana").from("trust_flags").insert({
          user_id: user.id,
          flag: 'email_alias_farming',
          severity: 'high',
          metadata: { base_email: base, alias_count: users.length },
        });
      }
    }
  }
  
  // Check 3: Stripe customer billing same → flag
  // (Done via Stripe webhook on customer.created)
  
  // Check 4: Device fingerprint reused across accounts
  const { data: fingerprints } = await supabase.schema("yana").rpc("find_fingerprint_clusters", {
    threshold: 2,
    window_days: 30,
  });
  
  for (const cluster of fingerprints ?? []) {
    if (cluster.users.length >= 2) {
      for (const userId of cluster.users) {
        await supabase.schema("yana").from("trust_flags").insert({
          user_id: userId,
          flag: 'device_fingerprint_shared',
          severity: 'high',
          metadata: { fingerprint: cluster.fingerprint, users: cluster.users },
        });
      }
    }
  }
  
  return Response.json({ ok: true });
}
```

### Layer 4 — Wallet payout pre-check

> Avant tout payout wallet (graines → euros), vérifier trust score user.

```typescript
// src/app/api/wallet/payout/route.ts
export async function POST(req: Request) {
  const userId = await requireAuth(req);
  
  // 1. Get current trust score
  const trustScore = await calculateUserTrustScore(userId);
  
  if (trustScore < 50) {
    // Soft-block payout, escalate to manual review
    await supabase.schema("yana").from("payout_review_queue").insert({
      user_id: userId,
      requested_amount: amount,
      trust_score: trustScore,
      flags: await getActiveFlags(userId),
      status: 'pending_review',
    });
    
    return Response.json({
      error: "Ton paiement est en cours de vérification. Délai 24-48h.",
    }, { status: 422 });
  }
  
  if (trustScore < 80) {
    // Allow but flag for audit
    await supabase.schema("yana").from("payout_audits").insert({
      user_id: userId,
      amount,
      trust_score: trustScore,
      auto_approved: true,
    });
  }
  
  // Process payout via Stripe Transfer
  await processStripePayout(userId, amount);
  
  return Response.json({ ok: true });
}

async function calculateUserTrustScore(userId: string): Promise<number> {
  let score = 100;
  
  // Apply each flag's severity
  const { data: flags } = await supabase.schema("yana")
    .from("trust_flags")
    .select("severity")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
  
  for (const flag of flags ?? []) {
    if (flag.severity === 'low') score -= 5;
    if (flag.severity === 'medium') score -= 15;
    if (flag.severity === 'high') score -= 30;
    if (flag.severity === 'critical') score -= 60;
  }
  
  // Apply trip integrity scores
  const { data: trips } = await supabase.schema("yana")
    .from("trips")
    .select("integrity_score")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (trips && trips.length > 0) {
    const avgIntegrity = trips.reduce((s, t) => s + (t.integrity_score ?? 100), 0) / trips.length;
    if (avgIntegrity < 80) score -= (80 - avgIntegrity);
  }
  
  return Math.max(0, Math.min(100, score));
}
```

### Layer 5 — Insurance lead transmission gating

> Avant transmettre un lead à un assureur, vérifier trust score ≥ 80.

```typescript
// src/app/api/insurance/lead/route.ts
export async function POST(req: Request) {
  const userId = await requireAuth(req);
  
  const trustScore = await calculateUserTrustScore(userId);
  
  if (trustScore < 80) {
    return Response.json({
      error: "Notre système nécessite plus de trajets vérifiés avant de te connecter à nos partenaires assureurs. Continue à conduire avec YANA pendant quelques semaines.",
    }, { status: 422 });
  }
  
  // Proceed with lead transmission (cf INSURANCE_PARTNERSHIPS.md)
  await transmitLeadToPartner(userId);
  
  return Response.json({ ok: true });
}
```

## DB schema

```sql
CREATE TABLE yana.trust_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  flag text NOT NULL CHECK (flag IN (
    'android_emulator', 'ios_jailbroken', 'mock_location_enabled',
    'not_play_recognized', 'speed_unrealistic', 'accelerometer_too_static',
    'teleportation_detected', 'gps_too_perfect', 'acceleration_unrealistic',
    'ip_cluster_suspect', 'email_alias_farming', 'device_fingerprint_shared',
    'manual_admin_flag'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trust_flags_user ON yana.trust_flags(user_id, created_at DESC);

CREATE TABLE yana.payout_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  requested_amount numeric NOT NULL,
  trust_score integer,
  flags jsonb,
  status text DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE yana.trust_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.payout_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS strict admin only
CREATE POLICY trust_flags_admin_only ON yana.trust_flags
  USING (auth.jwt() -> 'app_metadata' ->> 'role' IN ('super_admin', 'moderator'));
CREATE POLICY payout_review_admin_only ON yana.payout_review_queue
  USING (auth.jwt() -> 'app_metadata' ->> 'role' IN ('super_admin', 'moderator'));
```

## Dashboard `/admin/trust`

Sections :
1. **Pending payout reviews** : queue manuel review.
2. **Trust score distribution** : graph histogramme tous users.
3. **Flag detection stats** : top flags + trends.
4. **Suspicious patterns** : cluster IP/device/email.
5. **Manual override** : admin peut promote user à 100 trust si faux positif.

## Échec connu : trade-off accuracy vs UX

> Anti-tampering = friction. Si trop strict → vrais users frustrés.

### Approche "high-recall, low-precision" pour soft flags

- Soft flags (medium severity) ne bloquent rien immédiatement.
- Accumule pour CRON manuel review weekly.
- Tissma fait pass sur le top 20 cas suspects/semaine.

### Approche "high-precision" pour hard blocks

- Hard flags (high+critical) → block payout immédiat.
- User reçoit message "vérification en cours, délai 24-48h".
- Tissma valide manuellement.

## Coût anti-tampering

| Poste | Coût mensuel |
|---|---|
| Google Play Integrity API | gratuit (sous quotas) |
| Custom Cordova plugins (jailbreak, mock location) | 0 € (open-source) |
| Google reCAPTCHA v3 (signup) | 0 € |
| Tissma manual review (~20 cas/sem) | 2h/sem ≈ 8h/mois |
| **Total** | **~8h/mois Tissma + 0 € infra** |

## Pré-requis avant launch

- [ ] Tables `trust_flags` + `payout_review_queue` créées + RLS.
- [ ] Layer 1 device check intégré au signup + login.
- [ ] Layer 2 trip integrity check actif sur tous trips.
- [ ] Layer 3 CRON anti-farming actif horaire.
- [ ] Layer 4 wallet payout gating actif.
- [ ] Layer 5 insurance lead gating actif.
- [ ] Dashboard `/admin/trust` accessible Tissma.
- [ ] Tests end-to-end avec GPS Spoofer (tester que le système flag).
- [ ] Tests false positive avec 5+ vrais users (vérifier pas de blocages injustes).

## TL;DR

> YANA anti-tampering = 5 layers (device, trip, account farming, wallet, insurance).
> Trust score 0-100 calculé per user. Soft flags accumulent, hard flags bloquent payouts.
> Coût : 0 € infra + 8h/mois Tissma manual review.
> Tradeoff : strict assez pour bloquer fraude majeure, lax assez pour ne pas frustrer vrais users.
