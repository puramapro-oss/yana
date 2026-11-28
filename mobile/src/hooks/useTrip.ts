/**
 * Hook mobile useTrip — mirror fonctionnel de src/hooks/useTrip.ts (web).
 *
 * Cycle de vie :
 *  1. `start(vehicleId, withBackground)` → API /trips/start → TripTrackerRN.start
 *  2. Pendant le trajet, flush queue → /trips/event toutes les 3 s
 *  3. `stop()` → flush final + TripTrackerRN.stop + /trips/end → score
 *  4. `cancel()` → arrête tracker + /trips/end { cancel: true }
 *
 * Persistence : la queue d'events est sauvegardée toutes les 500 ms dans
 * AsyncStorage, donc un crash app ne perd jamais > 3 s d'events détectés.
 */
import { TripUploads } from '../lib/trip-observations'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TripTrackerRN, type TrackerTick } from '@/lib/trip-tracker'
import {
  apiTripStart,
  apiTripEvents,
  apiTripCoverage,
  apiTripEnd,
  apiTripCancel,
  type TripEndResponse,
  type TripMode,
} from '@/lib/trip-api'
import {
  drain,
  enqueueEvent,
  requeue,
  restoreQueue,
  setActiveTrip,
  getActiveTrip,
  resetQueue,
  queueSize,
} from '@/lib/event-queue'
import { isNoPhoneEnabled, startPhoneUseWatcher } from '@/lib/screen-time'

export type TripStatus = 'idle' | 'starting' | 'active' | 'paused' | 'ending' | 'error'

export interface LiveTripState {
  trip_id: string | null
  status: TripStatus
  started_at: number | null
  distance_m: number
  duration_sec: number
  current_speed_kmh: number | null
  break_reminder_due: boolean
  max_speed_kmh: number
  events_count: number
  queue_size: number
  sensors_active: boolean
  error: string | null
}

const INITIAL: LiveTripState = {
  trip_id: null,
  status: 'idle',
  started_at: null,
  distance_m: 0,
  duration_sec: 0,
  current_speed_kmh: null,
  break_reminder_due: false,
  max_speed_kmh: 0,
  events_count: 0,
  queue_size: 0,
  sensors_active: false,
  error: null,
}

const FLUSH_INTERVAL_MS = 3_000
const FLUSH_BATCH_MAX = 50

export function useTrip() {
  const [state, setState] = useState<LiveTripState>(INITIAL)
  const uploadsRef = useRef<TripUploads | null>(null)
  const trackerRef = useRef<TripTrackerRN | null>(null)
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phoneWatcherStopRef = useRef<(() => void) | null>(null)

  const stopFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }, [])

  const startFlushTimer = useCallback((uploads: TripUploads) => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setInterval(() => { void uploads.flush() }, FLUSH_INTERVAL_MS)
  }, [])

  // Restaure la queue au premier mount (reprise après kill app).
  useEffect(() => {
    void restoreQueue().then((q) => {
      if (q.events.length > 0 && q.trip_id) {
        setState((s) => ({ ...s, trip_id: q.trip_id, queue_size: q.events.length }))
      }
    })
    return () => {
      trackerRef.current?.stop().catch(() => null)
      stopFlushTimer()
      void uploadsRef.current?.cancel()
      phoneWatcherStopRef.current?.()
      phoneWatcherStopRef.current = null
    }
  }, [stopFlushTimer])

  const start = useCallback(
    async (opts: {
      vehicle_id: string
      trip_mode?: TripMode
      passengers_count?: number
      with_background?: boolean
    }): Promise<{ error: string | null }> => {
      if (state.status === 'active' || state.status === 'paused' || state.status === 'starting') {
        return { error: 'Un trajet est déjà en cours.' }
      }

      setState({ ...INITIAL, status: 'starting' })

      let tripId: string
      try {
        const res = await apiTripStart({
          vehicle_id: opts.vehicle_id,
          trip_mode: opts.trip_mode ?? 'solo',
          passengers_count: opts.passengers_count ?? 0,
        })
        tripId = res.trip_id
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Impossible de démarrer le trajet.'
        setState({ ...INITIAL, status: 'error', error: msg })
        return { error: msg }
      }

      setActiveTrip(tripId)

      const uploads = new TripUploads(
        (receipt) => apiTripCoverage({ trip_id: tripId, ...receipt }),
        async () => {
          const batch = drain(FLUSH_BATCH_MAX)
          if (!batch.length) return true
          try {
            await apiTripEvents({ trip_id: tripId, events: batch })
            setState((s) => ({ ...s, queue_size: queueSize() }))
            return true
          } catch {
            if (getActiveTrip() === tripId) requeue(batch)
            return false
          }
        },
        queueSize,
      )
      uploadsRef.current = uploads
      const tracker = new TripTrackerRN()
      trackerRef.current = tracker

      try {
        await tracker.start(
          {
            onTick: (t: TrackerTick) => {
              uploads.observe(t)
              setState((s) => ({
                ...s,
                distance_m: t.distance_m,
                duration_sec: t.duration_sec,
                current_speed_kmh: t.current_speed_kmh,
                break_reminder_due: t.break_reminder_due,
                max_speed_kmh: t.max_speed_kmh,
                events_count: t.events_count,
                queue_size: queueSize(),
              }))
            },
            onEvent: () => {
              setState((s) => ({ ...s, queue_size: queueSize() }))
            },
            onError: (msg: string) => {
              setState((s) => ({ ...s, error: msg }))
            },
          },
          opts.with_background ?? false,
        )
      } catch {
        await apiTripCancel({ trip_id: tripId }).catch(() => null)
        await resetQueue()
        trackerRef.current = null
        const msg = 'Active la géolocalisation pour tracker ton trajet.'
        setState({ ...INITIAL, status: 'error', error: msg })
        return { error: msg }
      }

      startFlushTimer(uploads)

      // No-Phone-While-Driving watcher si opt-in activé.
      if (await isNoPhoneEnabled()) {
        phoneWatcherStopRef.current?.()
        phoneWatcherStopRef.current = startPhoneUseWatcher({
          onPhoneUse: () => {
            setState((s) => ({
              ...s,
              events_count: s.events_count + 1,
              queue_size: queueSize(),
            }))
          },
        })
      }

      setState({
        ...INITIAL,
        trip_id: tripId,
        status: 'active',
        started_at: Date.now(),
        sensors_active: tracker.areSensorsActive(),
      })
      return { error: null }
    },
    [state.status, startFlushTimer],
  )

  const pause = useCallback(() => {
    if (state.status !== 'active') return
    trackerRef.current?.pause()
    setState((s) => ({ ...s, status: 'paused' }))
  }, [state.status])

  const resume = useCallback(() => {
    if (state.status !== 'paused') return
    trackerRef.current?.resume()
    setState((s) => ({ ...s, status: 'active' }))
  }, [state.status])

  const stop = useCallback(async (): Promise<{
    score: TripEndResponse['score'] | null
    error: string | null
    distance_km: number
    duration_sec: number
  }> => {
    const tripId = state.trip_id ?? getActiveTrip()
    const tracker = trackerRef.current
    if (!tracker || !tripId) {
      return { score: null, error: 'Aucun trajet en cours.', distance_km: 0, duration_sec: 0 }
    }

    setState((s) => ({ ...s, status: 'ending' }))
    const finalTick = await tracker.stop()
    stopFlushTimer()
    phoneWatcherStopRef.current?.()
    phoneWatcherStopRef.current = null
    const journalComplete = await uploadsRef.current?.finish(finalTick)

    try {
      const res = await apiTripEnd({
        trip_id: tripId,
        distance_km: finalTick.distance_m / 1000,
        duration_sec: finalTick.duration_sec,
        max_speed_kmh: finalTick.coverage.accepted_fixes > 0 ? finalTick.max_speed_kmh : null,
        ...(journalComplete ? { coverage: finalTick.coverage } : {}),
        end_lat: finalTick.last_position?.lat ?? null,
        end_lng: finalTick.last_position?.lng ?? null,
      })
      trackerRef.current = null
      await resetQueue()
      setState(INITIAL)
      return {
        score: res.score,
        error: null,
        distance_km: finalTick.distance_m / 1000,
        duration_sec: finalTick.duration_sec,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Finalisation impossible.'
      trackerRef.current = null
      setState({ ...INITIAL, status: 'error', error: msg })
      return { score: null, error: msg, distance_km: 0, duration_sec: 0 }
    }
  }, [state.trip_id, stopFlushTimer])

  const cancel = useCallback(async () => {
    const tripId = state.trip_id ?? getActiveTrip()
    const tracker = trackerRef.current
    if (tracker) await tracker.stop()
    stopFlushTimer()
    await uploadsRef.current?.cancel()
    phoneWatcherStopRef.current?.()
    phoneWatcherStopRef.current = null
    if (tripId) {
      await apiTripCancel({ trip_id: tripId }).catch(() => null)
    }
    await resetQueue()
    trackerRef.current = null
    setState(INITIAL)
  }, [state.trip_id, stopFlushTimer])

  return {
    state,
    start,
    pause,
    resume,
    stop,
    cancel,
    /** Expose le tracker pour les features B2 (sensors) / B3 (fatigue). */
    trackerRef,
    /** Enqueue direct — utilisé par B2 sensor-buffer + B4 screen-time. */
    enqueue: enqueueEvent,
    isActive: state.status === 'active' || state.status === 'paused',
  }
}
