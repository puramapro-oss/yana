/**
 * Wrappers HTTP des routes Next.js web `/api/trips/*` pour le mobile.
 *
 * Auth = Bearer access_token Supabase (le serveur supporte cookies ou Bearer
 * via `createServerSupabaseClient(req)` — voir `src/lib/supabase-server.ts`).
 *
 * Chaque appel :
 *  - récupère le token frais via `supabase.auth.getSession()` (auto-refresh géré)
 *  - parse `{ error }` en cas d'échec et renvoie un message FR lisible
 *  - respecte le contrat API du web (mêmes enums, mêmes champs)
 */
import { supabase } from './supabase'
import { WEB_URL } from './constants'

const API_BASE = `${WEB_URL}/api/trips`

export type TripEventType =
  | 'harsh_brake'
  | 'harsh_accel'
  | 'sharp_turn'
  | 'speeding'
  | 'phone_use'
  | 'fatigue_signal'
  | 'break_missed'
  | 'focus_maintained'
  | 'smooth_drive'
  | 'eco_acceleration'

export type TripMode = 'solo' | 'carpool_driver' | 'carpool_passenger'

export interface DetectedEventPayload {
  event_type: TripEventType
  severity: number
  speed_kmh: number | null
  speed_limit_kmh: number | null
  g_force: number | null
  lat_rounded: number | null
  lng_rounded: number | null
  occurred_at: string
}

export interface TripStartResponse {
  trip_id: string
  started_at: string
}

export interface TripScoreResult {
  safety_score: number
  eco_score: number
  co2_kg: number
  seeds_earned: number
  events_summary: Record<TripEventType, number>
  medal: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend'
}

export interface TripEndResponse {
  score: TripScoreResult
  trip_id: string
  distance_km: number
  duration_sec: number
  plan_multiplier: number
  xp_gained: number
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Connexion requise. Reconnecte-toi.')
  return { Authorization: `Bearer ${token}` }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const auth = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.error ?? 'Erreur réseau. Réessaie.')
  }
  return payload as T
}

export async function apiTripStart(input: {
  vehicle_id: string
  trip_mode?: TripMode
  passengers_count?: number
  start_lat?: number
  start_lng?: number
}): Promise<TripStartResponse> {
  return post<TripStartResponse>('/start', input)
}

export async function apiTripEvents(input: {
  trip_id: string
  events: DetectedEventPayload[]
}): Promise<{ inserted: number }> {
  return post<{ inserted: number }>('/event', input)
}

export async function apiTripEnd(input: {
  trip_id: string
  distance_km: number
  duration_sec: number
  max_speed_kmh: number
  end_lat?: number | null
  end_lng?: number | null
}): Promise<TripEndResponse> {
  return post<TripEndResponse>('/end', input)
}

export async function apiTripCancel(input: { trip_id: string }): Promise<void> {
  await post('/end', { trip_id: input.trip_id, cancel: true })
}

export interface VehicleRow {
  id: string
  vehicle_type: 'car' | 'moto' | 'scooter' | 'ev_car' | 'ev_moto' | 'hybrid'
  brand: string | null
  model: string | null
  year: number | null
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid' | 'lpg' | 'none'
  is_primary: boolean
}

export async function apiVehiclesList(): Promise<VehicleRow[]> {
  const auth = await getAuthHeader()
  const res = await fetch(`${WEB_URL}/api/vehicles`, {
    method: 'GET',
    headers: auth,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error ?? 'Impossible de charger tes véhicules.')
  return (payload.vehicles ?? []) as VehicleRow[]
}
