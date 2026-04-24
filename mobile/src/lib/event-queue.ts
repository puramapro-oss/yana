/**
 * File persistée des `trip_events` côté mobile.
 *
 * Pourquoi persistée : si l'app est tuée pendant un trajet (reboot device,
 * crash app, kill par iOS memory pressure), les events déjà détectés ne
 * doivent pas être perdus. AsyncStorage ≠ SecureStore : pas chiffré mais
 * 5+ MB capacité, assez pour ~20k events (nombre largement hors-limite).
 *
 * Stratégie :
 *  - enqueue()       → push en mémoire + persist batch toutes les 500ms
 *  - drain(limit)    → retire `limit` events (max) pour envoi API
 *  - restore(tripId) → au boot, reprise de la queue si non vide
 *  - reset()         → après apiTripEvents OK
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from './constants'
import type { DetectedEventPayload } from './trip-api'

interface QueueShape {
  trip_id: string | null
  events: DetectedEventPayload[]
  updated_at: number
}

const EMPTY: QueueShape = { trip_id: null, events: [], updated_at: 0 }
const PERSIST_DEBOUNCE_MS = 500

let memory: QueueShape = { ...EMPTY }
let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist() {
  if (persistTimer) return
  persistTimer = setTimeout(async () => {
    persistTimer = null
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRIP_EVENT_QUEUE, JSON.stringify(memory))
    } catch {
      // Best-effort — si AsyncStorage fail on ne bloque pas le trip.
    }
  }, PERSIST_DEBOUNCE_MS)
}

export async function restoreQueue(): Promise<QueueShape> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_EVENT_QUEUE)
    if (!raw) {
      memory = { ...EMPTY }
      return memory
    }
    const parsed = JSON.parse(raw) as QueueShape
    memory = {
      trip_id: parsed.trip_id ?? null,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      updated_at: parsed.updated_at ?? 0,
    }
    return memory
  } catch {
    memory = { ...EMPTY }
    return memory
  }
}

export function setActiveTrip(tripId: string | null): void {
  memory = { trip_id: tripId, events: [], updated_at: Date.now() }
  schedulePersist()
}

export function getActiveTrip(): string | null {
  return memory.trip_id
}

export function enqueueEvent(event: DetectedEventPayload): void {
  if (!memory.trip_id) return
  memory.events.push(event)
  memory.updated_at = Date.now()
  schedulePersist()
}

/** Retire et renvoie jusqu'à `limit` events. Ne persiste pas tant que flushed(). */
export function drain(limit: number): DetectedEventPayload[] {
  if (memory.events.length === 0) return []
  const batch = memory.events.splice(0, limit)
  memory.updated_at = Date.now()
  schedulePersist()
  return batch
}

/** Réinsère en tête un batch dont l'envoi API a échoué. */
export function requeue(events: DetectedEventPayload[]): void {
  if (events.length === 0) return
  memory.events.unshift(...events)
  memory.updated_at = Date.now()
  schedulePersist()
}

export function queueSize(): number {
  return memory.events.length
}

export async function resetQueue(): Promise<void> {
  memory = { ...EMPTY }
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRIP_EVENT_QUEUE)
  } catch {
    // Best-effort
  }
}
