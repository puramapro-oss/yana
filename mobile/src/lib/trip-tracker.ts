import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { BACKGROUND_LOCATION_TASK } from './constants'
import { enqueueEvent } from './event-queue'
import { SensorBuffer } from './sensor-buffer'
import type { DetectedEventPayload, TripEventType } from './trip-api'

import { TripObservations, type ObservationTick } from './trip-observations'

const EVENT_COOLDOWN_MS = 3_000
const MS2_HARD_BRAKE = -3.0
const MS2_HARD_ACCEL = 3.0

export interface TrackerTick extends ObservationTick {
  events_count: number
}

export interface TrackerCallbacks {
  onTick?: (tick: TrackerTick) => void
  onEvent?: (event: DetectedEventPayload) => void
  onError?: (message: string) => void
}

function severityFromMs2(absMs2: number): number {
  if (absMs2 >= 6) return 5
  if (absMs2 >= 5) return 4
  if (absMs2 >= 4) return 3
  if (absMs2 >= 3) return 2
  return 1
}

// Foreground and background providers can deliver the same fix. Feed the
// active trip only; the shared observer discards stale or duplicate timestamps.
let activeBackgroundListener: ((loc: Location.LocationObject) => void) | null = null

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !activeBackgroundListener) return
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations
  for (const loc of locations ?? []) activeBackgroundListener(loc)
})

export class TripTrackerRN {
  private sub: Location.LocationSubscription | null = null
  private backgroundActive = false
  private observations = new TripObservations()
  private backgroundListener = (loc: Location.LocationObject) => this.handleLocation(loc)
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
    return this.observations.paused
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
    this.observations = new TripObservations()
    this.eventsCount = 0
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
              notificationBody: 'Le suivi GPS du trajet est actif.',
              notificationColor: '#F97316',
            },
            pausesUpdatesAutomatically: false,
          })
        }
        activeBackgroundListener = this.backgroundListener
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
    if (this.isRunning()) this.observations.pause()
  }

  resume(): void {
    if (this.isRunning()) this.observations.resume()
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
    if (this.backgroundActive && activeBackgroundListener === this.backgroundListener) {
      activeBackgroundListener = null
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

    return this.snapshot()
  }

  private handleLocation(loc: Location.LocationObject): void {
    const sample = this.observations.accept(loc)
    if (!sample) return
    const acceleration = sample.acceleration
    if (acceleration !== null && acceleration <= MS2_HARD_BRAKE) {
      this.tryEmitEvent(loc, 'harsh_brake', severityFromMs2(-acceleration), acceleration)
    } else if (acceleration !== null && acceleration >= MS2_HARD_ACCEL) {
      this.tryEmitEvent(loc, 'harsh_accel', severityFromMs2(acceleration), acceleration)
    }
    if (sample.speedMs !== null) {
      this.sensors?.updateContext({ lat: loc.coords.latitude, lng: loc.coords.longitude }, sample.speedMs * 3.6)
    }
  }

  private tryEmitEvent(
    loc: Location.LocationObject,
    type: TripEventType,
    severity: number,
    accelMs2: number,
  ): void {
    const now = Date.now()
    const last = this.cooldowns.get(type) ?? 0
    if (now - last < EVENT_COOLDOWN_MS) return
    this.cooldowns.set(type, now)
    this.eventsCount += 1

    const speedMs = loc.coords.speed
    const event: DetectedEventPayload = {
      event_type: type,
      severity,
      speed_kmh: speedMs != null ? Math.round(speedMs * 3.6) : null,
      speed_limit_kmh: null,
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
    const speed = this.observations.snapshot().current_speed_kmh
    if (!this.isRunning() || speed === null || speed <= 0) return
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
    return { ...this.observations.snapshot(), events_count: this.eventsCount }
  }
}
