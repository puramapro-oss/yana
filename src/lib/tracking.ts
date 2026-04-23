// lib/tracking.ts — Wrapper navigator.geolocation pour SAFE DRIVE web MVP.
// Détection hard_brake / hard_accel / speeding via delta de vitesse GPS entre
// deux positions (1 Hz typique). DeviceMotion désactivé en web MVP (fiabilité
// cross-browser faible, cross-OS différents axes, iOS requiert permission
// modal bloquante). P7 mobile Expo ajoutera expo-sensors.

import type { TripEventType } from '@/types'

const EARTH_RADIUS_M = 6_371_000
const GPS_JITTER_M = 2               // ignorer déplacements < 2m entre 2 points
const EVENT_COOLDOWN_MS = 3_000      // même type d'event: 1 toutes les 3 sec
const DEFAULT_SPEED_LIMIT_KMH = 130  // fallback si pas de speedlimit OSM
const MS_TO_KMH = 3.6
const MS2_HARD_BRAKE = -3.0
const MS2_HARD_ACCEL = 3.0
const SPEED_DELTA_MIN_DT_MS = 500    // ignorer deltas calculés sur dt < 500ms

export interface TrackingOptions {
  /** Appelé à chaque mise à jour positionnelle valide. */
  onPosition?: (pos: {
    lat: number
    lng: number
    accuracy: number
    speed_ms: number | null
    speed_kmh: number
    timestamp: number
  }) => void
  /** Event safety détecté. Lat/lng sont déjà arrondis (3 décimales = ~100m). */
  onEvent?: (event: DetectedEvent) => void
  /** Mise à jour état live (distance cumulée, durée, vitesse max…). */
  onTick?: (state: TrackerTick) => void
  /** Erreur non-bloquante (permission refusée, signal perdu…). */
  onError?: (message: string) => void
}

export interface DetectedEvent {
  event_type: TripEventType
  severity: number                       // 1..5
  speed_kmh: number | null
  speed_limit_kmh: number | null
  g_force: number | null                 // approximé via delta vitesse GPS
  lat_rounded: number | null
  lng_rounded: number | null
  occurred_at: string                    // ISO
}

export interface TrackerTick {
  distance_m: number
  duration_sec: number
  current_speed_kmh: number
  max_speed_kmh: number
  events_count: number
  last_position: { lat: number; lng: number; accuracy: number; timestamp: number } | null
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

function geolocErrorFr(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Active la géolocalisation dans les réglages de ton navigateur pour tracker ton trajet.'
    case err.POSITION_UNAVAILABLE:
      return 'Signal GPS indisponible. Va dans un endroit plus dégagé et réessaie.'
    case err.TIMEOUT:
      return 'Le GPS met trop longtemps à répondre. Vérifie ta connexion et réessaie.'
    default:
      return 'Erreur de géolocalisation inconnue.'
  }
}

function severityFromMs2(absMs2: number): number {
  if (absMs2 >= 6) return 5
  if (absMs2 >= 5) return 4
  if (absMs2 >= 4) return 3
  if (absMs2 >= 3) return 2
  return 1
}

export class TripTracker {
  private watchId: number | null = null
  private lastPosition: GeolocationPosition | null = null
  private startMs = 0
  private pausedAccumMs = 0
  private pauseStartedMs: number | null = null
  private distanceM = 0
  private maxSpeedKmh = 0
  private eventsCount = 0
  private cooldowns = new Map<TripEventType, number>()
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private opts: TrackingOptions = {}

  isRunning(): boolean {
    return this.watchId !== null
  }

  isPaused(): boolean {
    return this.pauseStartedMs !== null
  }

  async start(opts: TrackingOptions): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      opts.onError?.('La géolocalisation n’est pas disponible sur cet appareil.')
      throw new Error('geolocation_unsupported')
    }
    if (this.watchId !== null) return

    this.opts = opts
    this.startMs = Date.now()
    this.pausedAccumMs = 0
    this.pauseStartedMs = null
    this.distanceM = 0
    this.maxSpeedKmh = 0
    this.eventsCount = 0
    this.lastPosition = null
    this.cooldowns.clear()

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => opts.onError?.(geolocErrorFr(err)),
      { enableHighAccuracy: true, maximumAge: 1_000, timeout: 15_000 },
    )

    this.tickTimer = setInterval(() => this.emitTick(), 1_000)
  }

  pause(): void {
    if (this.watchId === null || this.pauseStartedMs !== null) return
    this.pauseStartedMs = Date.now()
  }

  resume(): void {
    if (this.pauseStartedMs === null) return
    this.pausedAccumMs += Date.now() - this.pauseStartedMs
    this.pauseStartedMs = null
  }

  stop(): TrackerTick {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId)
    }
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.pauseStartedMs !== null) {
      this.pausedAccumMs += Date.now() - this.pauseStartedMs
      this.pauseStartedMs = null
    }
    const tick = this.snapshot()
    this.watchId = null
    this.tickTimer = null
    return tick
  }

  private handlePosition(pos: GeolocationPosition): void {
    // Ignorer si en pause ou précision trop mauvaise
    if (this.pauseStartedMs !== null) return
    if (pos.coords.accuracy > 50) return

    const currentSpeedMs = pos.coords.speed ?? 0
    const currentSpeedKmh = Math.max(0, currentSpeedMs * MS_TO_KMH)

    if (currentSpeedKmh > this.maxSpeedKmh) this.maxSpeedKmh = currentSpeedKmh

    const prev = this.lastPosition
    if (prev) {
      const meters = haversineMeters(
        { lat: prev.coords.latitude, lng: prev.coords.longitude },
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
      )
      if (meters >= GPS_JITTER_M) {
        this.distanceM += meters
      }

      const dtMs = pos.timestamp - prev.timestamp
      const prevSpeedMs = prev.coords.speed ?? 0
      if (dtMs >= SPEED_DELTA_MIN_DT_MS) {
        const accelMs2 = (currentSpeedMs - prevSpeedMs) / (dtMs / 1000)

        if (accelMs2 <= MS2_HARD_BRAKE) {
          this.tryEmitEvent(pos, 'harsh_brake', severityFromMs2(Math.abs(accelMs2)), accelMs2)
        } else if (accelMs2 >= MS2_HARD_ACCEL) {
          this.tryEmitEvent(pos, 'harsh_accel', severityFromMs2(accelMs2), accelMs2)
        }
      }

      if (currentSpeedKmh > DEFAULT_SPEED_LIMIT_KMH) {
        const over = currentSpeedKmh - DEFAULT_SPEED_LIMIT_KMH
        this.tryEmitEvent(pos, 'speeding', severityFromMs2(over / 5), 0, DEFAULT_SPEED_LIMIT_KMH)
      }
    }

    this.lastPosition = pos
    this.opts.onPosition?.({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed_ms: pos.coords.speed,
      speed_kmh: currentSpeedKmh,
      timestamp: pos.timestamp,
    })
  }

  private tryEmitEvent(
    pos: GeolocationPosition,
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

    const event: DetectedEvent = {
      event_type: type,
      severity,
      speed_kmh: pos.coords.speed != null ? Math.round(pos.coords.speed * MS_TO_KMH) : null,
      speed_limit_kmh: speedLimitKmh ?? null,
      g_force: accelMs2 !== 0 ? Math.round((accelMs2 / 9.81) * 100) / 100 : null,
      lat_rounded: Math.round(pos.coords.latitude * 1000) / 1000,
      lng_rounded: Math.round(pos.coords.longitude * 1000) / 1000,
      occurred_at: new Date(pos.timestamp).toISOString(),
    }
    this.opts.onEvent?.(event)
  }

  private emitTick(): void {
    this.opts.onTick?.(this.snapshot())
  }

  private snapshot(): TrackerTick {
    const now = Date.now()
    const pausedMs = this.pausedAccumMs + (this.pauseStartedMs !== null ? now - this.pauseStartedMs : 0)
    const durationSec = Math.max(0, Math.floor((now - this.startMs - pausedMs) / 1000))
    const currentSpeedKmh = this.lastPosition?.coords.speed
      ? this.lastPosition.coords.speed * MS_TO_KMH
      : 0
    return {
      distance_m: Math.round(this.distanceM),
      duration_sec: durationSec,
      current_speed_kmh: Math.round(currentSpeedKmh * 10) / 10,
      max_speed_kmh: Math.round(this.maxSpeedKmh * 10) / 10,
      events_count: this.eventsCount,
      last_position: this.lastPosition
        ? {
            lat: this.lastPosition.coords.latitude,
            lng: this.lastPosition.coords.longitude,
            accuracy: this.lastPosition.coords.accuracy,
            timestamp: this.lastPosition.timestamp,
          }
        : null,
    }
  }
}
