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
