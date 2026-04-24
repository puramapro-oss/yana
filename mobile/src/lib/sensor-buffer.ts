/**
 * SensorBuffer — ring buffer accéléromètre + gyroscope 50 Hz × 10 s.
 *
 * Rôle : détection précise des événements harsh_brake / harsh_accel / sharp_turn
 * à partir des capteurs inertiels, plus fiable que le delta-GPS (qui souffre
 * du jitter et du lissage fourni par le firmware).
 *
 * Algo :
 *  - 50 Hz → 20 ms d'intervalle entre samples (expo-sensors setUpdateInterval(20))
 *  - ring buffer 500 pts = 10 s, overwrites en circulaire
 *  - détection sur fenêtre glissante 250 ms (12 samples) :
 *      accel.y < -3 m/s² sur >= 6 samples         → harsh_brake
 *      accel.y > +3 m/s² sur >= 6 samples         → harsh_accel
 *      |gyro.z| > 1.5 rad/s (86°/s) sur >= 6      → sharp_turn
 *  - cooldown 3 s par type (aligné TripTrackerRN) pour éviter duplicates
 *  - coord ref "natural portrait" : y = axe longitudinal (avant/arrière véhicule
 *    si téléphone posé en portrait vertical au tableau de bord)
 *
 * Calibration : on fait confiance au firmware natif (expo-sensors applique déjà
 * la compensation gravité sur Accelerometer.addListener — valeurs en g, pas m/s²).
 * On multiplie par 9.81 pour convertir g→m/s² et rester cohérent avec les seuils.
 */
import { Accelerometer, Gyroscope } from 'expo-sensors'
import type { EventSubscription } from 'expo-modules-core'
import type { DetectedEventPayload, TripEventType } from './trip-api'

const SAMPLE_INTERVAL_MS = 20 // 50 Hz
const BUFFER_SIZE = 500 // 10 s à 50 Hz
const WINDOW_SAMPLES = 12 // 240 ms
const THRESHOLD_RATIO_TRIGGER = 0.5 // ≥ 50% des samples en dépassement
const MS2_HARD_BRAKE = -3.0
const MS2_HARD_ACCEL = 3.0
const GYRO_SHARP_TURN_RAD_S = 1.5
const G_TO_MS2 = 9.81
const EVENT_COOLDOWN_MS = 3_000

export interface AccelSample {
  x: number
  y: number
  z: number
  t: number
}

export interface GyroSample {
  x: number
  y: number
  z: number
  t: number
}

export interface SensorCallbacks {
  /**
   * Appelé quand un event harsh est détecté. Le TripTrackerRN l'injecte
   * dans la queue via `injectSensorEvent()` (partage du cooldown).
   */
  onEvent?: (event: DetectedEventPayload) => void
}

function severityFromMs2(absMs2: number): number {
  if (absMs2 >= 6) return 5
  if (absMs2 >= 5) return 4
  if (absMs2 >= 4) return 3
  if (absMs2 >= 3) return 2
  return 1
}

function severityFromRadS(absRadS: number): number {
  if (absRadS >= 4) return 5
  if (absRadS >= 3) return 4
  if (absRadS >= 2.5) return 3
  if (absRadS >= 2) return 2
  return 1
}

export class SensorBuffer {
  private accel: AccelSample[] = []
  private gyro: GyroSample[] = []
  private accelSub: EventSubscription | null = null
  private gyroSub: EventSubscription | null = null
  private cooldowns = new Map<TripEventType, number>()
  private cbs: SensorCallbacks = {}
  private positionRef: { lat: number; lng: number } | null = null
  private speedKmhRef = 0

  /**
   * Les événements sensors n'ont pas de position propre — TripTrackerRN
   * met à jour ces références à chaque tick GPS pour enrichir les payloads.
   */
  updateContext(pos: { lat: number; lng: number } | null, speedKmh: number): void {
    this.positionRef = pos
    this.speedKmhRef = speedKmh
  }

  async start(cbs: SensorCallbacks): Promise<boolean> {
    this.cbs = cbs
    try {
      const accelAvailable = await Accelerometer.isAvailableAsync()
      const gyroAvailable = await Gyroscope.isAvailableAsync()
      if (!accelAvailable) return false

      Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS)
      this.accelSub = Accelerometer.addListener((d) => this.pushAccel(d))

      if (gyroAvailable) {
        Gyroscope.setUpdateInterval(SAMPLE_INTERVAL_MS)
        this.gyroSub = Gyroscope.addListener((d) => this.pushGyro(d))
      }
      return true
    } catch {
      return false
    }
  }

  stop(): void {
    this.accelSub?.remove()
    this.gyroSub?.remove()
    this.accelSub = null
    this.gyroSub = null
    this.accel = []
    this.gyro = []
    this.cooldowns.clear()
  }

  private pushAccel(d: { x: number; y: number; z: number }): void {
    const now = Date.now()
    // Convertit g → m/s² pour alignement avec les seuils GPS.
    this.accel.push({ x: d.x * G_TO_MS2, y: d.y * G_TO_MS2, z: d.z * G_TO_MS2, t: now })
    if (this.accel.length > BUFFER_SIZE) this.accel.shift()
    this.checkAccelWindow(now)
  }

  private pushGyro(d: { x: number; y: number; z: number }): void {
    const now = Date.now()
    // expo-sensors gyro en rad/s directement.
    this.gyro.push({ x: d.x, y: d.y, z: d.z, t: now })
    if (this.gyro.length > BUFFER_SIZE) this.gyro.shift()
    this.checkGyroWindow(now)
  }

  private checkAccelWindow(now: number): void {
    const window = this.accel.slice(-WINDOW_SAMPLES)
    if (window.length < WINDOW_SAMPLES) return

    let brakeHits = 0
    let accelHits = 0
    let peakBrake = 0
    let peakAccel = 0

    for (const s of window) {
      if (s.y <= MS2_HARD_BRAKE) {
        brakeHits += 1
        if (s.y < peakBrake) peakBrake = s.y
      } else if (s.y >= MS2_HARD_ACCEL) {
        accelHits += 1
        if (s.y > peakAccel) peakAccel = s.y
      }
    }

    const ratio = THRESHOLD_RATIO_TRIGGER * WINDOW_SAMPLES
    if (brakeHits >= ratio) {
      this.tryEmit('harsh_brake', severityFromMs2(Math.abs(peakBrake)), peakBrake, now)
    }
    if (accelHits >= ratio) {
      this.tryEmit('harsh_accel', severityFromMs2(peakAccel), peakAccel, now)
    }
  }

  private checkGyroWindow(now: number): void {
    const window = this.gyro.slice(-WINDOW_SAMPLES)
    if (window.length < WINDOW_SAMPLES) return

    let turnHits = 0
    let peakTurn = 0
    for (const s of window) {
      const abs = Math.abs(s.z)
      if (abs >= GYRO_SHARP_TURN_RAD_S) {
        turnHits += 1
        if (abs > peakTurn) peakTurn = abs
      }
    }

    const ratio = THRESHOLD_RATIO_TRIGGER * WINDOW_SAMPLES
    if (turnHits >= ratio) {
      this.tryEmit('sharp_turn', severityFromRadS(peakTurn), 0, now)
    }
  }

  private tryEmit(
    type: TripEventType,
    severity: number,
    accelMs2: number,
    now: number,
  ): void {
    const last = this.cooldowns.get(type) ?? 0
    if (now - last < EVENT_COOLDOWN_MS) return
    this.cooldowns.set(type, now)

    const event: DetectedEventPayload = {
      event_type: type,
      severity,
      speed_kmh: Math.round(this.speedKmhRef),
      speed_limit_kmh: null,
      g_force: accelMs2 !== 0 ? Math.round((accelMs2 / G_TO_MS2) * 100) / 100 : null,
      lat_rounded: this.positionRef ? Math.round(this.positionRef.lat * 1000) / 1000 : null,
      lng_rounded: this.positionRef ? Math.round(this.positionRef.lng * 1000) / 1000 : null,
      occurred_at: new Date(now).toISOString(),
    }
    this.cbs.onEvent?.(event)
  }

  /** Diagnostics — utilisé par l'UI debug et Maestro (B2 gate). */
  getBufferStats(): { accel_samples: number; gyro_samples: number } {
    return {
      accel_samples: this.accel.length,
      gyro_samples: this.gyro.length,
    }
  }
}
