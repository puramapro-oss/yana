// Pure GPS observations shared by the browser and the Expo tracker.
const MAX_FIX_AGE_MS = 15_000
const MAX_ACCURACY_M = 50
const MAX_RECORDED_SPEED_MS = 400 / 3.6 // Maximum accepted by the trip API.
const MIN_ACCEL_INTERVAL_MS = 500
const REMINDER_AFTER_MS = 105 * 60_000
const REST_INTERVAL_MS = 15 * 60_000

interface PhoneFix {
  timestamp: number
  coords: {
    latitude: number
    longitude: number
    accuracy: number | null
    speed: number | null
  }
}

export interface ObservationTick {
  distance_m: number
  observed_distance_m: number
  duration_sec: number
  current_speed_kmh: number | null
  max_speed_kmh: number
  break_reminder_due: boolean
  last_position: { lat: number; lng: number; accuracy: number; timestamp: number } | null
  coverage: { accepted_fixes: number; observed_seconds: number }
}

function speedMs(fix: PhoneFix | null): number | null {
  const speed = fix?.coords.speed
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 && speed <= MAX_RECORDED_SPEED_MS ? speed : null
}

function metersBetween(a: PhoneFix, b: PhoneFix): number {
  const rad = Math.PI / 180
  const lat1 = a.coords.latitude * rad
  const lat2 = b.coords.latitude * rad
  const dLng = (b.coords.longitude - a.coords.longitude) * rad
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(Math.min(1, h)))
}

export class TripObservations {
  private startedAt: number
  private segmentStartedAt: number
  private lastTimestamp = -Infinity
  private lastFix: PhoneFix | null = null
  private pauseAt: number | null = null
  private pausedMs = 0
  private reminderBaselineMs = 0
  private observedMs = 0
  private acceptedFixes = 0
  private distance = 0
  private observedDistance = 0
  private maxSpeed = 0

  constructor(now = Date.now()) {
    this.startedAt = now
    this.segmentStartedAt = now
  }

  get paused(): boolean {
    return this.pauseAt !== null
  }

  pause(now = Date.now()): void {
    if (this.paused) return
    this.pauseAt = now
    this.lastFix = null
  }

  resume(now = Date.now()): void {
    if (this.pauseAt === null) return
    const length = Math.max(0, now - this.pauseAt)
    this.pausedMs += length
    if (length >= REST_INTERVAL_MS) {
      this.reminderBaselineMs = now - this.startedAt - this.pausedMs
    }
    this.segmentStartedAt = now
    this.pauseAt = null
  }

  // A coordinate without a valid speed can locate the trip but cannot establish
  // a speed observation or connect two windows for acceleration or coverage.
  accept(fix: PhoneFix, now = Date.now()): { speedMs: number | null; acceleration: number | null } | null {
    const { timestamp, coords } = fix
    if (this.paused || !Number.isFinite(timestamp) || timestamp < this.segmentStartedAt ||
        timestamp <= this.lastTimestamp || timestamp > now || now - timestamp > MAX_FIX_AGE_MS) return null
    this.lastTimestamp = timestamp
    if (coords.accuracy === null || !Number.isFinite(coords.accuracy) || coords.accuracy < 0 ||
        coords.accuracy > MAX_ACCURACY_M || !Number.isFinite(coords.latitude) ||
        Math.abs(coords.latitude) > 90 || !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180) {
      this.lastFix = null
      return null
    }

    const previous = this.lastFix
    const speed = speedMs(fix)
    this.lastFix = fix
    if (speed !== null) {
      this.acceptedFixes += 1
      this.maxSpeed = Math.max(this.maxSpeed, speed * 3.6)
    }

    let acceleration: number | null = null
    if (previous) {
      const dt = timestamp - previous.timestamp
      if (dt <= MAX_FIX_AGE_MS) {
        const previousSpeed = speedMs(previous)
        const meters = metersBetween(previous, fix)
        const seconds = dt / 1000
        const maxSpeed = speed !== null && previousSpeed !== null ? Math.max(speed, previousSpeed) : MAX_RECORDED_SPEED_MS
        const uncertainty = coords.accuracy + (previous.coords.accuracy ?? MAX_ACCURACY_M)
        if (meters > maxSpeed * seconds + uncertainty) return { speedMs: speed, acceleration: null }
        if (meters >= 2 && (previousSpeed !== 0 || speed !== 0)) this.distance += meters
        if (previousSpeed !== null && speed !== null) {
          this.observedMs += dt
          if (meters >= 2) this.observedDistance += Math.min(meters, maxSpeed * seconds)
          if (dt >= MIN_ACCEL_INTERVAL_MS) acceleration = (speed - previousSpeed) * 1000 / dt
        }
      }
    }
    return { speedMs: speed, acceleration }
  }

  snapshot(now = Date.now()): ObservationTick {
    const activeMs = Math.max(0, (this.pauseAt ?? now) - this.startedAt - this.pausedMs)
    const duration = Math.floor(activeMs / 1000)
    const fix = this.lastFix
    const current = fix && now - fix.timestamp <= MAX_FIX_AGE_MS ? speedMs(fix) : null
    return {
      distance_m: Math.round(this.distance),
      observed_distance_m: Math.round(this.observedDistance),
      duration_sec: duration,
      current_speed_kmh: current === null ? null : Math.round(current * 36) / 10,
      max_speed_kmh: Math.round(this.maxSpeed * 10) / 10,
      break_reminder_due: !this.paused && activeMs - this.reminderBaselineMs >= REMINDER_AFTER_MS,
      last_position: fix && fix.coords.accuracy !== null ? {
        lat: fix.coords.latitude, lng: fix.coords.longitude,
        accuracy: fix.coords.accuracy, timestamp: fix.timestamp,
      } : null,
      coverage: {
        accepted_fixes: this.acceptedFixes,
        observed_seconds: Math.min(duration, Math.floor(this.observedMs / 1000)),
      },
    }
  }
}

type CoverageReceipt = ObservationTick['coverage'] & { distance_m: number }

// A receipt is sent only for a newly observed minute. Offline receipts expire,
// and closing waits for outstanding requests before asking the server to score.
export class TripUploads {
  private lastAttemptSeconds = 0
  private sendingReceipt: Promise<void> | null = null
  private sendingEvents: Promise<boolean> | null = null
  private closed = false
  private readonly sendReceipt: (receipt: CoverageReceipt) => Promise<unknown>
  private readonly sendBatch: () => Promise<boolean>
  private readonly queueSize: () => number

  constructor(sendReceipt: (receipt: CoverageReceipt) => Promise<unknown>,
    sendBatch: () => Promise<boolean>, queueSize: () => number) {
    this.sendReceipt = sendReceipt
    this.sendBatch = sendBatch
    this.queueSize = queueSize
  }

  observe(tick: ObservationTick): void {
    if (this.closed || this.sendingReceipt || tick.coverage.observed_seconds - this.lastAttemptSeconds < 60) return
    this.lastAttemptSeconds = tick.coverage.observed_seconds
    this.sendingReceipt = this.sendReceipt({ ...tick.coverage, distance_m: tick.observed_distance_m })
      .then(() => undefined, () => undefined)
      .finally(() => { this.sendingReceipt = null })
  }

  flush(): Promise<boolean> {
    if (this.closed) return Promise.resolve(false)
    if (!this.sendingEvents) {
      this.sendingEvents = this.sendBatch().catch(() => false)
        .finally(() => { this.sendingEvents = null })
    }
    return this.sendingEvents
  }

  async finish(tick: ObservationTick): Promise<boolean> {
    await this.sendingReceipt
    this.observe(tick)
    this.closed = true
    await this.sendingReceipt
    if (this.sendingEvents && !(await this.sendingEvents)) return false
    while (this.queueSize() > 0) {
      if (!(await this.sendBatch().catch(() => false))) return false
    }
    return true
  }

  async cancel(): Promise<void> {
    this.closed = true
    await Promise.all([this.sendingReceipt, this.sendingEvents])
  }
}
