/**
 * TripTrackerRN — wrapper `expo-location` (foreground + background) pour YANA mobile.
 *
 * Algo porté depuis `src/lib/tracking.ts` (web) :
 *  - haversineMeters pour la distance cumulée
 *  - seuils MS2_HARD_BRAKE = -3.0 / HARD_ACCEL = 3.0 (m/s²)
 *  - cooldown 3 s par type d'event
 *  - GPS jitter filter (< 2 m entre 2 points)
 *  - speed limit par défaut 130 km/h (fallback)
 *
 * Différences mobile :
 *  - watchPositionAsync au lieu de navigator.geolocation.watchPosition
 *  - BackgroundLocationTask optionnel (ios UIBackgroundModes+location, android FG service)
 *  - pause réelle supportée via `expo-location.hasStartedLocationUpdatesAsync`
 *  - émission d'events vers la queue persistée (pas directement API)
 */
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { BACKGROUND_LOCATION_TASK } from './constants'
import { enqueueEvent } from './event-queue'
import { SensorBuffer } from './sensor-buffer'
import type { DetectedEventPayload, TripEventType } from './trip-api'

const EARTH_RADIUS_M = 6_371_000
const GPS_JITTER_M = 2
const EVENT_COOLDOWN_MS = 3_000
const DEFAULT_SPEED_LIMIT_KMH = 130
const MS_TO_KMH = 3.6
const MS2_HARD_BRAKE = -3.0
const MS2_HARD_ACCEL = 3.0
const SPEED_DELTA_MIN_DT_MS = 500
const ACCURACY_MAX_M = 50

export interface TrackerTick {
  distance_m: number
  duration_sec: number
  current_speed_kmh: number
  max_speed_kmh: number
  events_count: number
  last_position: { lat: number; lng: number; accuracy: number; timestamp: number } | null
}

export interface TrackerCallbacks {
  onTick?: (tick: TrackerTick) => void
  onEvent?: (event: DetectedEventPayload) => void
  onError?: (message: string) => void
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

function severityFromMs2(absMs2: number): number {
  if (absMs2 >= 6) return 5
  if (absMs2 >= 5) return 4
  if (absMs2 >= 4) return 3
  if (absMs2 >= 3) return 2
  return 1
}

/**
 * Background task handler — reçoit les locations quand l'app est en veille.
 * Doit être défini au niveau module (pas dans une fonction) pour être enregistré
 * par TaskManager. Chaque location = event flush queue, pas de scoring ici.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations
  if (!locations || locations.length === 0) return
  // En background on collecte les positions dans la queue — le scoring
  // harsh_brake/accel sera fait à la reprise foreground (plus fiable, sensors OK).
  // Ici on se contente de push des breadcrumbs "smooth_drive" marqueurs de continuité.
  for (const loc of locations) {
    const speedMs = loc.coords.speed ?? 0
    const speedKmh = Math.max(0, speedMs * MS_TO_KMH)
    if (speedKmh > DEFAULT_SPEED_LIMIT_KMH) {
      const over = speedKmh - DEFAULT_SPEED_LIMIT_KMH
      enqueueEvent({
        event_type: 'speeding',
        severity: severityFromMs2(over / 5),
        speed_kmh: Math.round(speedKmh),
        speed_limit_kmh: DEFAULT_SPEED_LIMIT_KMH,
        g_force: null,
        lat_rounded: Math.round(loc.coords.latitude * 1000) / 1000,
        lng_rounded: Math.round(loc.coords.longitude * 1000) / 1000,
        occurred_at: new Date(loc.timestamp).toISOString(),
      })
    }
  }
})

export class TripTrackerRN {
  private sub: Location.LocationSubscription | null = null
  private backgroundActive = false
  private lastLoc: Location.LocationObject | null = null
  private startMs = 0
  private pausedAccumMs = 0
  private pauseStartedMs: number | null = null
  private distanceM = 0
  private maxSpeedKmh = 0
  private eventsCount = 0
  private cooldowns = new Map<TripEventType, number>()
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private cbs: TrackerCallbacks = {}
  private sensors: SensorBuffer | null = null
  private sensorsActive = false

  isRunning(): boolean {
    return this.sub !== null
  }

  isPaused(): boolean {
    return this.pauseStartedMs !== null
  }

  areSensorsActive(): boolean {
    return this.sensorsActive
  }

  /**
   * Demande permission foreground. Tente background si `withBackground=true`.
   * Renvoie { foreground, background } pour que l'UI puisse afficher l'état.
   */
  static async requestPermissions(withBackground = false): Promise<{
    foreground: boolean
    background: boolean
    errorMessage: string | null
  }> {
    const fg = await Location.requestForegroundPermissionsAsync()
    if (fg.status !== 'granted') {
      return {
        foreground: false,
        background: false,
        errorMessage: 'Active la géolocalisation dans tes réglages pour démarrer un trajet.',
      }
    }
    if (!withBackground) {
      return { foreground: true, background: false, errorMessage: null }
    }
    const bg = await Location.requestBackgroundPermissionsAsync()
    return {
      foreground: true,
      background: bg.status === 'granted',
      errorMessage:
        bg.status === 'granted'
          ? null
          : "L'arrière-plan reste désactivé : le trajet suivra quand l'app est ouverte.",
    }
  }

  async start(cbs: TrackerCallbacks, withBackground = false): Promise<void> {
    if (this.sub !== null) return
    this.cbs = cbs
    this.startMs = Date.now()
    this.pausedAccumMs = 0
    this.pauseStartedMs = null
    this.distanceM = 0
    this.maxSpeedKmh = 0
    this.eventsCount = 0
    this.lastLoc = null
    this.cooldowns.clear()

    try {
      this.sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => this.handleLocation(loc),
      )
    } catch {
      cbs.onError?.("Impossible d'activer le GPS. Vérifie tes réglages.")
      throw new Error('location_start_failed')
    }

    if (withBackground && Platform.OS !== 'web') {
      try {
        const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
        if (!alreadyRegistered) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 20,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'YANA suit ton trajet',
              notificationBody: 'Conduis en conscience — YANA note ton SAFE & GREEN score.',
              notificationColor: '#F97316',
            },
            pausesUpdatesAutomatically: false,
          })
        }
        this.backgroundActive = true
      } catch {
        // Background désactivable silencieusement — foreground continue.
        this.backgroundActive = false
      }
    }

    this.tickTimer = setInterval(() => this.emitTick(), 1000)

    // Sensors ON — fusion accel+gyro avec GPS. Silence si device sans IMU (rare).
    this.sensors = new SensorBuffer()
    this.sensorsActive = await this.sensors.start({
      onEvent: (event) => this.injectSensorEvent(event),
    })
    if (!this.sensorsActive) {
      this.sensors = null
    }
  }

  pause(): void {
    if (this.sub === null || this.pauseStartedMs !== null) return
    this.pauseStartedMs = Date.now()
  }

  resume(): void {
    if (this.pauseStartedMs === null) return
    this.pausedAccumMs += Date.now() - this.pauseStartedMs
    this.pauseStartedMs = null
  }

  async stop(): Promise<TrackerTick> {
    if (this.sub) {
      this.sub.remove()
      this.sub = null
    }
    if (this.sensors) {
      this.sensors.stop()
      this.sensors = null
      this.sensorsActive = false
    }
    if (this.backgroundActive) {
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      } catch {
        // Best-effort
      }
      this.backgroundActive = false
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    if (this.pauseStartedMs !== null) {
      this.pausedAccumMs += Date.now() - this.pauseStartedMs
      this.pauseStartedMs = null
    }
    return this.snapshot()
  }

  private handleLocation(loc: Location.LocationObject): void {
    if (this.pauseStartedMs !== null) return
    if ((loc.coords.accuracy ?? 999) > ACCURACY_MAX_M) return

    const currentSpeedMs = loc.coords.speed ?? 0
    const currentSpeedKmh = Math.max(0, currentSpeedMs * MS_TO_KMH)
    if (currentSpeedKmh > this.maxSpeedKmh) this.maxSpeedKmh = currentSpeedKmh

    const prev = this.lastLoc
    if (prev) {
      const meters = haversineMeters(
        { lat: prev.coords.latitude, lng: prev.coords.longitude },
        { lat: loc.coords.latitude, lng: loc.coords.longitude },
      )
      if (meters >= GPS_JITTER_M) this.distanceM += meters

      const dtMs = loc.timestamp - prev.timestamp
      const prevSpeedMs = prev.coords.speed ?? 0
      if (dtMs >= SPEED_DELTA_MIN_DT_MS) {
        const accelMs2 = (currentSpeedMs - prevSpeedMs) / (dtMs / 1000)
        if (accelMs2 <= MS2_HARD_BRAKE) {
          this.tryEmitEvent(loc, 'harsh_brake', severityFromMs2(Math.abs(accelMs2)), accelMs2)
        } else if (accelMs2 >= MS2_HARD_ACCEL) {
          this.tryEmitEvent(loc, 'harsh_accel', severityFromMs2(accelMs2), accelMs2)
        }
      }

      if (currentSpeedKmh > DEFAULT_SPEED_LIMIT_KMH) {
        const over = currentSpeedKmh - DEFAULT_SPEED_LIMIT_KMH
        this.tryEmitEvent(loc, 'speeding', severityFromMs2(over / 5), 0, DEFAULT_SPEED_LIMIT_KMH)
      }
    }

    this.lastLoc = loc
    this.sensors?.updateContext(
      { lat: loc.coords.latitude, lng: loc.coords.longitude },
      currentSpeedKmh,
    )
  }

  private tryEmitEvent(
    loc: Location.LocationObject,
    type: TripEventType,
    severity: number,
    accelMs2: number,
    speedLimitKmh?: number,
  ): void {
    const now = Date.now()
    const last = this.cooldowns.get(type) ?? 0
    if (now - last < EVENT_COOLDOWN_MS) return
    this.cooldowns.set(type, now)
    this.eventsCount += 1

    const speedMs = loc.coords.speed ?? 0
    const event: DetectedEventPayload = {
      event_type: type,
      severity,
      speed_kmh: speedMs != null ? Math.round(speedMs * MS_TO_KMH) : null,
      speed_limit_kmh: speedLimitKmh ?? null,
      g_force: accelMs2 !== 0 ? Math.round((accelMs2 / 9.81) * 100) / 100 : null,
      lat_rounded: Math.round(loc.coords.latitude * 1000) / 1000,
      lng_rounded: Math.round(loc.coords.longitude * 1000) / 1000,
      occurred_at: new Date(loc.timestamp).toISOString(),
    }
    enqueueEvent(event)
    this.cbs.onEvent?.(event)
  }

  /**
   * Surface d'injection pour sensor-buffer (B2) — permet au gyro/accel
   * hors GPS de signaler un harsh event détecté plus précisément.
   */
  injectSensorEvent(event: DetectedEventPayload): void {
    const now = Date.now()
    const last = this.cooldowns.get(event.event_type) ?? 0
    if (now - last < EVENT_COOLDOWN_MS) return
    this.cooldowns.set(event.event_type, now)
    this.eventsCount += 1
    enqueueEvent(event)
    this.cbs.onEvent?.(event)
  }

  private emitTick(): void {
    this.cbs.onTick?.(this.snapshot())
  }

  private snapshot(): TrackerTick {
    const now = Date.now()
    const pausedMs =
      this.pausedAccumMs + (this.pauseStartedMs !== null ? now - this.pauseStartedMs : 0)
    const durationSec = Math.max(0, Math.floor((now - this.startMs - pausedMs) / 1000))
    const currentSpeedKmh = this.lastLoc?.coords.speed
      ? this.lastLoc.coords.speed * MS_TO_KMH
      : 0
    return {
      distance_m: Math.round(this.distanceM),
      duration_sec: durationSec,
      current_speed_kmh: Math.round(currentSpeedKmh * 10) / 10,
      max_speed_kmh: Math.round(this.maxSpeedKmh * 10) / 10,
      events_count: this.eventsCount,
      last_position: this.lastLoc
        ? {
            lat: this.lastLoc.coords.latitude,
            lng: this.lastLoc.coords.longitude,
            accuracy: this.lastLoc.coords.accuracy ?? 0,
            timestamp: this.lastLoc.timestamp,
          }
        : null,
    }
  }
}
