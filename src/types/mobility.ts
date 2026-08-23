// YANA — PURAMA Mobility Wellness (schema yana)
// Types alignés sur schema.sql v1.0 (2026-04-23)

export type Role = 'user' | 'ambassadeur' | 'super_admin'
export type Plan = 'free' | 'essentiel' | 'infini' | 'legende'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type SubscriptionInterval = 'monthly' | 'yearly'
export type Theme = 'dark' | 'light' | 'oled'
export type SanskritLevel = 'novice' | 'sadhaka' | 'yogin' | 'siddha' | 'mahatma' | 'libere'
export type AmbassadeurTier =
  | 'bronze'
  | 'argent'
  | 'or'
  | 'platine'
  | 'diamant'
  | 'legende'
  | 'titan'
  | 'eternel'

// ──────────────────────────────────────────────────────────────────
// PROFILE (id = auth.users.id direct — pattern vida_sante LEARNINGS #45)
// ──────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  plan: Plan
  plan_multiplier: number
  credits: number
  daily_questions: number
  daily_questions_reset_at: string
  referral_code: string | null
  referred_by: string | null
  wallet_balance_cents: number
  purama_points: number
  seeds_balance: number
  sanskrit_level: SanskritLevel
  awakening_level: number
  affirmations_seen: number
  ambassadeur_tier: AmbassadeurTier | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_started_at: string | null
  subscription_status: SubscriptionStatus | null
  xp: number
  level: number
  streak_days: number
  last_streak_at: string | null
  theme: Theme
  locale: string
  notifications_enabled: boolean
  tutorial_completed: boolean
  onboarded: boolean
  onfido_status: 'pending' | 'approved' | 'rejected' | 'expired' | null
  trust_score: number
  license_optin: 'none' | 'points_tracking'
  co2_offset_total_kg: number
  trees_planted_total: number
  total_trips: number
  total_distance_km: number
  total_safety_score: number | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────────────────────────
// YANA MOBILITY CORE
// ──────────────────────────────────────────────────────────────────
export type VehicleType = 'car' | 'moto' | 'scooter' | 'ev_car' | 'ev_moto' | 'hybrid'
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid' | 'lpg' | 'none'
export type TripMode = 'solo' | 'carpool_driver' | 'carpool_passenger'
export type TripStatus = 'in_progress' | 'completed' | 'cancelled' | 'flagged'
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

export interface Vehicle {
  id: string
  user_id: string
  vehicle_type: VehicleType
  brand: string | null
  model: string | null
  year: number | null
  fuel_type: FuelType | null
  license_plate_hash: string | null
  is_primary: boolean
  obd_paired: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  user_id: string
  vehicle_id: string | null
  trip_mode: TripMode
  started_at: string
  ended_at: string | null
  distance_km: number
  duration_sec: number
  max_speed_kmh: number | null
  avg_speed_kmh: number | null
  safety_score: number | null
  eco_score: number | null
  co2_kg: number
  fuel_consumed_l: number | null
  seeds_earned: number
  euros_earned_cents: number
  points_earned: number
  passengers_count: number
  route_polyline: string | null
  start_geohash: string | null
  end_geohash: string | null
  weather: string | null
  status: TripStatus
  created_at: string
}

export interface TripEvent {
  id: string
  trip_id: string
  event_type: TripEventType
  severity: number
  lat_rounded: number | null
  lng_rounded: number | null
  speed_kmh: number | null
  speed_limit_kmh: number | null
  g_force: number | null
  metadata: Record<string, unknown>
  occurred_at: string
}

export interface FatigueSession {
  id: string
  user_id: string
  trip_id: string | null
  hrv_score: number | null
  sleep_score: number | null
  sleep_hours: number | null
  break_recommended_at: string | null
  break_taken_at: string | null
  break_duration_min: number | null
  source: 'healthkit' | 'health_connect' | 'manual' | 'computed' | null
  created_at: string
}

export interface SafeDriverMonthlyScore {
  id: string
  user_id: string
  month: string
  avg_safety_score: number | null
  avg_eco_score: number | null
  total_trips: number
  total_km: number
  insurance_discount_eligible: boolean
  badge: 'gold' | 'silver' | 'bronze' | 'learner' | null
  created_at: string
}

// Résultat de lib/scoring.ts — scoring trip terminé
export interface TripScoreResult {
  safety_score: number          // 0-100
  eco_score: number             // 0-100
  co2_kg: number                // absolue, arrondi 0.001
  seeds_earned: number          // Graines (1/km safe + bonus eco + bonus carpool)
  badge: 'gold' | 'silver' | 'bronze' | 'learner'
  event_counts: Partial<Record<TripEventType, number>>
  breakdown: {
    base: number
    events_penalty: number
    events_bonus: number
    speeding_penalty: number
  }
}

// État live d'un trajet en cours (client state hook useTrip)
export interface LiveTripState {
  trip_id: string | null
  status: 'idle' | 'active' | 'paused' | 'ending'
  started_at: number | null     // epoch ms
  paused_ms: number             // cumul pauses
  distance_m: number
  duration_sec: number
  current_speed_kmh: number
  max_speed_kmh: number
  events_count: number
  last_position: { lat: number; lng: number; accuracy: number; timestamp: number } | null
  error: string | null
}

// ──────────────────────────────────────────────────────────────────
// COVOITURAGE (Dual Reward)
// ──────────────────────────────────────────────────────────────────
export type CarpoolStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled'
export type CarpoolBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export interface Carpool {
  id: string
  driver_id: string
  vehicle_id: string | null
  from_city: string
  to_city: string
  from_geohash: string
  to_geohash: string
  meeting_point_label: string | null
  meeting_point_geohash: string | null
  departure_at: string
  estimated_duration_min: number | null
  seats_total: number
  seats_remaining: number
  price_per_seat_cents: number
  prime_per_seat_cents: number
  description: string | null
  status: CarpoolStatus
  requires_kyc: boolean
  women_only: boolean
  silent_ride: boolean
  pets_allowed: boolean
  created_at: string
  updated_at: string
}

export interface CarpoolBooking {
  id: string
  carpool_id: string
  passenger_id: string
  seats: number
  total_price_cents: number
  total_prime_cents: number
  driver_rating: number | null
  passenger_rating: number | null
  driver_feedback: string | null
  passenger_feedback: string | null
  payout_driver_cents: number
  payout_passenger_cents: number
  payout_platform_cents: number
  payout_eco_pool_cents: number
  status: CarpoolBookingStatus
  safe_walk_contacts: Array<{ name: string; phone: string }>
  booked_at: string
  completed_at: string | null
}

// ──────────────────────────────────────────────────────────────────
// GREEN / ARBRES
// ──────────────────────────────────────────────────────────────────
export interface TreePlanted {
  id: string
  user_id: string
  trip_id: string | null
  provider: 'tree_nation' | 'ecosia' | 'reforest_action' | 'manual'
  tree_count: number
  co2_offset_kg: number
  cost_cents: number
  certificate_url: string | null
  ots_proof: string | null
  planted_at: string
}

export interface Co2Factor {
  id: string
  vehicle_type: string
  fuel_type: string
  kg_co2_per_km: number
  source: string
  effective_from: string
}

// ──────────────────────────────────────────────────────────────────
// MISSIONS (Mobility)
// ──────────────────────────────────────────────────────────────────
export type MissionCategory = 'SELF' | 'OTHERS' | 'EARTH' | 'REST'
export type MissionPillar =
  | 'mental'
  | 'corporel'
  | 'financier'
  | 'alimentaire'
  | 'energetique'
  | 'relationnel'
  | 'informationnel'
export type VerificationType =
  | 'sensors_auto'
  | 'photo_ai'
  | 'screen_time_native'
  | 'peer'
  | 'manual'
  | 'system'
export type CompletionStatus = 'pending' | 'validated' | 'rejected' | 'flagged'

export interface MobilityMission {
  id: string
  slug: string
  title: string
  description: string
  icon: string | null
  category: MissionCategory
  pillar: MissionPillar
  seeds_reward: number
  points_reward: number
  verification_type: VerificationType
  vehicle_type_filter: VehicleType[]
  max_per_day: number
  max_total: number | null
  active: boolean
  priority: number
  created_at: string
}

