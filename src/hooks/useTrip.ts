'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TripTracker, type DetectedEvent, type TrackerTick } from '@/lib/tracking'
import type { LiveTripState, TripMode, TripScoreResult } from '@/types'

const INITIAL: LiveTripState = {
  trip_id: null,
  status: 'idle',
  started_at: null,
  paused_ms: 0,
  distance_m: 0,
  duration_sec: 0,
  current_speed_kmh: 0,
  max_speed_kmh: 0,
  events_count: 0,
  last_position: null,
  error: null,
}

interface StartOpts {
  vehicle_id: string
  trip_mode?: TripMode
  passengers_count?: number
}

export function useTrip() {
  const [state, setState] = useState<LiveTripState>(INITIAL)
  const trackerRef = useRef<TripTracker | null>(null)
  const eventQueueRef = useRef<DetectedEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Flush queue d'events vers /api/trips/event toutes les 3 secondes
  // (batch pour éviter saturation — LEARNINGS pattern P2)
  const startFlushTimer = useCallback((tripId: string) => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setInterval(async () => {
      if (eventQueueRef.current.length === 0) return
      const batch = eventQueueRef.current.splice(0, eventQueueRef.current.length)
      try {
        await fetch('/api/trips/event', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ trip_id: tripId, events: batch }),
        })
      } catch {
        // Remettre en file si fail pour retry
        eventQueueRef.current.unshift(...batch)
      }
    }, 3_000)
  }, [])

  const stopFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      trackerRef.current?.stop()
      stopFlushTimer()
    }
  }, [stopFlushTimer])

  const start = useCallback(
    async ({ vehicle_id, trip_mode = 'solo', passengers_count = 0 }: StartOpts): Promise<{ error: string | null }> => {
      if (state.status === 'active' || state.status === 'paused') {
        return { error: 'Un trajet est déjà en cours.' }
      }

      // Créer le trip côté API d'abord (auth + vehicle ownership check)
      let tripId: string
      try {
        const res = await fetch('/api/trips/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vehicle_id, trip_mode, passengers_count }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) return { error: payload.error ?? 'Impossible de démarrer le trajet.' }
        tripId = payload.trip_id as string
      } catch {
        return { error: 'Connexion impossible. Vérifie ton réseau.' }
      }

      const tracker = new TripTracker()
      trackerRef.current = tracker

      try {
        await tracker.start({
          onTick: (t: TrackerTick) => {
            setState((s) => ({
              ...s,
              distance_m: t.distance_m,
              duration_sec: t.duration_sec,
              current_speed_kmh: t.current_speed_kmh,
              max_speed_kmh: t.max_speed_kmh,
              events_count: t.events_count,
              last_position: t.last_position,
            }))
          },
          onEvent: (event: DetectedEvent) => {
            eventQueueRef.current.push(event)
          },
          onError: (msg: string) => {
            setState((s) => ({ ...s, error: msg }))
          },
        })
      } catch {
        // Rollback: annuler le trip créé si tracker ne démarre pas
        await fetch('/api/trips/end', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ trip_id: tripId, cancel: true }),
        }).catch(() => null)
        trackerRef.current = null
        return { error: 'Active la géolocalisation pour tracker ton trajet.' }
      }

      startFlushTimer(tripId)
      setState({
        ...INITIAL,
        trip_id: tripId,
        status: 'active',
        started_at: Date.now(),
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

  const stop = useCallback(async (): Promise<{ score: TripScoreResult | null; error: string | null }> => {
    const tracker = trackerRef.current
    const tripId = state.trip_id
    if (!tracker || !tripId) return { score: null, error: 'Aucun trajet en cours.' }

    setState((s) => ({ ...s, status: 'ending' }))
    const finalTick = tracker.stop()
    stopFlushTimer()

    // Flush queue restante avant end
    if (eventQueueRef.current.length > 0) {
      const batch = eventQueueRef.current.splice(0, eventQueueRef.current.length)
      await fetch('/api/trips/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, events: batch }),
      }).catch(() => null)
    }

    try {
      const res = await fetch('/api/trips/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          distance_km: finalTick.distance_m / 1000,
          duration_sec: finalTick.duration_sec,
          max_speed_kmh: finalTick.max_speed_kmh,
          end_lat: finalTick.last_position?.lat ?? null,
          end_lng: finalTick.last_position?.lng ?? null,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      trackerRef.current = null
      setState(INITIAL)
      if (!res.ok) return { score: null, error: payload.error ?? 'Finalisation impossible.' }
      return { score: payload.score as TripScoreResult, error: null }
    } catch {
      trackerRef.current = null
      setState(INITIAL)
      return { score: null, error: 'Connexion impossible. Ton trajet a été sauvegardé, reconnecte-toi.' }
    }
  }, [state.trip_id, stopFlushTimer])

  const cancel = useCallback(async () => {
    const tracker = trackerRef.current
    const tripId = state.trip_id
    tracker?.stop()
    stopFlushTimer()
    eventQueueRef.current = []
    if (tripId) {
      await fetch('/api/trips/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, cancel: true }),
      }).catch(() => null)
    }
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
    isActive: state.status === 'active' || state.status === 'paused',
  }
}
