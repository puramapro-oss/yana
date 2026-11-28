import type { TripEventType } from '@/types'

import { TripObservations, type ObservationTick } from '../../mobile/src/lib/trip-observations'

const EVENT_COOLDOWN_MS = 3_000
const MS2_HARD_BRAKE = -3.0
const MS2_HARD_ACCEL = 3.0

export interface TrackingOptions {
  /** Appelé à chaque mise à jour positionnelle valide. */
  onPosition?: (pos: {
    lat: number
    lng: number
    accuracy: number
    speed_ms: number | null
    speed_kmh: number | null
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

export interface TrackerTick extends ObservationTick {
  events_count: number
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
  private observations = new TripObservations()
  private eventsCount = 0
  private cooldowns = new Map<TripEventType, number>()
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private opts: TrackingOptions = {}

  isRunning(): boolean {
    return this.watchId !== null
  }

  isPaused(): boolean {
    return this.observations.paused
  }

  async start(opts: TrackingOptions): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      opts.onError?.('La géolocalisation n’est pas disponible sur cet appareil.')
      throw new Error('geolocation_unsupported')
    }
    if (this.watchId !== null) return

    this.opts = opts
    this.observations = new TripObservations()
    this.eventsCount = 0
    this.cooldowns.clear()

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => opts.onError?.(geolocErrorFr(err)),
      { enableHighAccuracy: true, maximumAge: 1_000, timeout: 15_000 },
    )

    this.tickTimer = setInterval(() => this.emitTick(), 1_000)
  }

  pause(): void {
    if (this.isRunning()) this.observations.pause()
  }

  resume(): void {
    if (this.isRunning()) this.observations.resume()
  }

  stop(): TrackerTick {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId)
    }
    if (this.tickTimer) clearInterval(this.tickTimer)

    const tick = this.snapshot()
    this.watchId = null
    this.tickTimer = null
    return tick
  }

  private handlePosition(pos: GeolocationPosition): void {
    const sample = this.observations.accept(pos)
    if (!sample) return
    const acceleration = sample.acceleration
    if (acceleration !== null && acceleration <= MS2_HARD_BRAKE) {
      this.tryEmitEvent(pos, 'harsh_brake', severityFromMs2(-acceleration), acceleration)
    } else if (acceleration !== null && acceleration >= MS2_HARD_ACCEL) {
      this.tryEmitEvent(pos, 'harsh_accel', severityFromMs2(acceleration), acceleration)
    }
    this.opts.onPosition?.({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed_ms: sample.speedMs,
      speed_kmh: sample.speedMs === null ? null : sample.speedMs * 3.6,
      timestamp: pos.timestamp,
    })
  }

  private tryEmitEvent(
    pos: GeolocationPosition,
    type: TripEventType,
    severity: number,
    accelMs2: number,
  ): void {
    const now = Date.now()
    const last = this.cooldowns.get(type) ?? 0
    if (now - last < EVENT_COOLDOWN_MS) return
    this.cooldowns.set(type, now)
    this.eventsCount += 1

    const event: DetectedEvent = {
      event_type: type,
      severity,
      speed_kmh: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null,
      speed_limit_kmh: null,
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
    return { ...this.observations.snapshot(), events_count: this.eventsCount }
  }
}
