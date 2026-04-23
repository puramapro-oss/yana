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

export interface MissionCompletion {
  id: string
  user_id: string
  mission_id: string
  trip_id: string | null
  proof_data: Record<string, unknown>
  proof_url: string | null
  ai_confidence: number | null
  status: CompletionStatus
  seeds_credited: number
  points_credited: number
  validated_at: string | null
  completed_at: string
  mission?: MobilityMission
}

// ──────────────────────────────────────────────────────────────────
// UNIVERSELS PURAMA (parrainage, wallet, karma jeux, achievements)
// ──────────────────────────────────────────────────────────────────
export interface Referral {
  id: string
  referrer_id: string
  referred_id: string | null
  ip_hash: string | null
  status: 'pending' | 'subscribed' | 'expired' | 'refunded'
  first_payment_at: string | null
  commission_cents: number
  tier: 1 | 2 | 3
  created_at: string
}

export interface Commission {
  id: string
  user_id: string
  referral_id: string | null
  amount_cents: number
  commission_type:
    | 'referral_n1'
    | 'referral_n2'
    | 'referral_n3'
    | 'ambassador_bonus'
    | 'tier_bonus'
    | 'milestone'
  source: string | null
  stripe_invoice_id: string | null
  status: 'pending' | 'credited' | 'paid_out' | 'reverted'
  credited_at: string | null
  created_at: string
}

export interface WalletTransaction {
  id: string
  user_id: string
  amount_cents: number
  direction: 'credit' | 'debit'
  reason: string
  ref_type: string | null
  ref_id: string | null
  balance_after_cents: number
  created_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount_cents: number
  iban_masked: string
  iban_hash: string
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
  requested_at: string
  processed_at: string | null
  rejection_reason: string | null
}

export interface PointTransaction {
  id: string
  user_id: string
  amount: number
  direction: 'credit' | 'debit'
  reason: string
  source: string | null
  balance_after: number
  created_at: string
}

export type KarmaGameType =
  | 'dharma_wheel'
  | 'collective_challenge'
  | 'monthly_tournament'
  | 'rare_quest'
  | 'lightning_deals'
  | 'jackpot_earth'
  | 'pillar_mental'
  | 'pillar_corporel'
  | 'pillar_financier'
  | 'pillar_bloom'
  | 'pillar_autonomie'
  | 'mirror'
  | 'reader'
  | 'lunar_cycle'
  | 'mahatmas'
  | 'invisible_gift'
  | 'shadow_passage'
  | 'resonance_369'
  | 'grand_wheel'
  | 'treasure_hunt'
  | 'creative'
  | 'living_heritage'
  | 'masks'
  | 'time_capsule'
  | 'wave'

export interface KarmaDraw {
  id: string
  game_type: KarmaGameType
  period_start: string
  period_end: string
  pool_cents: number
  max_winners: number
  status: 'upcoming' | 'live' | 'completed' | 'cancelled'
  random_org_signature: string | null
  drawn_at: string | null
  created_at: string
}

export interface KarmaTicket {
  id: string
  user_id: string
  source: string
  draw_id: string | null
  used: boolean
  created_at: string
}

export interface KarmaWinner {
  id: string
  draw_id: string
  user_id: string
  ticket_id: string | null
  rank: number
  amount_cents: number
  seeds_awarded: number
  claimed: boolean
  created_at: string
}

export interface Achievement {
  id: string
  slug: string
  title: string
  description: string
  icon: string | null
  points_reward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition_json: Record<string, unknown>
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  achievement?: Achievement
}

export interface Aide {
  id: string
  slug: string
  nom: string
  type_aide: string
  profil_eligible: string[]
  situation_eligible: string[]
  montant_max_eur: number | null
  url_officielle: string | null
  description: string
  region: string | null
  handicap_only: boolean
  active: boolean
  created_at: string
}

// ──────────────────────────────────────────────────────────────────
// PAYMENT / INVOICES / PRIME
// ──────────────────────────────────────────────────────────────────
export interface Payment {
  id: string
  user_id: string
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  amount_cents: number
  currency: string
  status: string
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  number: string
  stripe_invoice_id: string | null
  amount_cents: number
  currency: string
  pdf_url: string | null
  issued_at: string
}

export interface WelcomePrime {
  id: string
  user_id: string
  total_cents: number
  tranche_1_cents: number
  tranche_1_paid_at: string | null
  tranche_2_cents: number
  tranche_2_paid_at: string | null
  tranche_3_cents: number
  tranche_3_paid_at: string | null
  withdrawal_unlocked_at: string | null
  status: 'active' | 'completed' | 'refunded' | 'cancelled'
}

// ──────────────────────────────────────────────────────────────────
// NAMA-PILOTE (chat)
// ──────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model: string | null
  tokens_input: number | null
  tokens_output: number | null
  created_at: string
}

// ──────────────────────────────────────────────────────────────────
// SUPPORT / NOTIFS / SPIRITUAL
// ──────────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface SupportTicket {
  id: string
  user_id: string | null
  name: string
  email: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  resolved_by_ai: boolean
  ai_response: string | null
  escalated: boolean
  created_at: string
}

export interface FaqArticle {
  id: string
  category: string
  question: string
  answer: string
  search_keywords: string[]
  view_count: number
  helpful_count: number
  active: boolean
  priority: number
  created_at: string
}

export interface Affirmation {
  id: string
  category: 'love' | 'power' | 'abundance' | 'health' | 'wisdom' | 'gratitude' | 'journey' | 'safety'
  text_fr: string
  text_en: string
  frequency_weight: number
}

export interface GratitudeEntry {
  id: string
  user_id: string
  content: string
  trip_id: string | null
  created_at: string
}

export interface Intention {
  id: string
  user_id: string
  content: string
  trip_id: string | null
  completed: boolean
  created_at: string
}

export interface BreathSession {
  id: string
  user_id: string
  protocol: string
  duration_sec: number
  trip_id: string | null
  created_at: string
}

export interface PushToken {
  id: string
  user_id: string
  expo_push_token: string
  platform: 'ios' | 'android' | 'web'
  enabled: boolean
  created_at: string
}

// ──────────────────────────────────────────────────────────────────
// KYC / Trust
// ──────────────────────────────────────────────────────────────────
export interface KycVerification {
  id: string
  user_id: string
  provider: 'onfido' | 'jumio' | 'idnow'
  applicant_id: string | null
  check_id: string | null
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'expired'
  triggered_by: 'terra_nova_activation' | 'carpool_first_booking'
  result_json: Record<string, unknown> | null
  created_at: string
  completed_at: string | null
}
