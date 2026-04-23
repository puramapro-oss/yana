-- ═════════════════════════════════════════════════════════════════════
-- YANA — SCHEMA SQL (PURAMA Mobility Wellness)
-- Version : 1.0 — 2026-04-23
-- Déployer : sshpass ssh root@VPS → docker exec supabase-db psql -U supabase_admin -d postgres -f /tmp/schema.sql
-- PgREST : PGRST_DB_SCHEMAS doit inclure 'yana' + docker compose up -d --force-recreate rest (PAS restart)
-- ═════════════════════════════════════════════════════════════════════

-- 0. SCHEMA + EXTENSIONS
CREATE SCHEMA IF NOT EXISTS yana;

GRANT USAGE ON SCHEMA yana TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA yana TO postgres, supabase_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA yana GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA yana GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA yana GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- 1. FONCTIONS UTILITAIRES

CREATE OR REPLACE FUNCTION yana.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════════
-- 2. TABLES — FOUNDATION
-- ═════════════════════════════════════════════════════════════════════

-- 2.1 profiles (id = auth.users.id direct — pattern vida_sante LEARNINGS #45)
CREATE TABLE IF NOT EXISTS yana.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','ambassadeur','super_admin')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','essentiel','infini','legende')),
  plan_multiplier INT NOT NULL DEFAULT 1,
  credits INT NOT NULL DEFAULT 20,
  daily_questions INT NOT NULL DEFAULT 0,
  daily_questions_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES yana.profiles(id),
  wallet_balance_cents BIGINT NOT NULL DEFAULT 0,
  purama_points BIGINT NOT NULL DEFAULT 0,
  seeds_balance BIGINT NOT NULL DEFAULT 0,
  sanskrit_level TEXT NOT NULL DEFAULT 'novice' CHECK (sanskrit_level IN ('novice','sadhaka','yogin','siddha','mahatma','libere')),
  awakening_level INT NOT NULL DEFAULT 1 CHECK (awakening_level BETWEEN 1 AND 5),
  affirmations_seen INT NOT NULL DEFAULT 0,
  ambassadeur_tier TEXT CHECK (ambassadeur_tier IN ('bronze','argent','or','platine','diamant','legende','titan','eternel')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_status TEXT CHECK (subscription_status IN ('trialing','active','past_due','canceled','unpaid')),
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak_days INT NOT NULL DEFAULT 0,
  last_streak_at DATE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','oled')),
  locale TEXT NOT NULL DEFAULT 'fr',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  tutorial_completed BOOLEAN NOT NULL DEFAULT false,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  onfido_status TEXT CHECK (onfido_status IN ('pending','approved','rejected','expired')),
  trust_score INT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  license_optin TEXT NOT NULL DEFAULT 'none' CHECK (license_optin IN ('none','points_tracking')),
  co2_offset_total_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
  trees_planted_total INT NOT NULL DEFAULT 0,
  total_trips INT NOT NULL DEFAULT 0,
  total_distance_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_safety_score NUMERIC(5,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON yana.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON yana.profiles(referral_code);
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON yana.profiles(stripe_customer_id);

-- Trigger auto-create profile on auth signup
CREATE OR REPLACE FUNCTION yana.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO yana.profiles (id, email, full_name, avatar_url, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    UPPER(SUBSTRING(MD5(NEW.id::text || NEW.email) FROM 1 FOR 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION yana.handle_new_user();

CREATE TRIGGER profiles_touch_updated BEFORE UPDATE ON yana.profiles FOR EACH ROW EXECUTE FUNCTION yana.touch_updated_at();

-- ═════════════════════════════════════════════════════════════════════
-- 3. TABLES — YANA CORE (Mobilité)
-- ═════════════════════════════════════════════════════════════════════

-- 3.1 vehicles
CREATE TABLE IF NOT EXISTS yana.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car','moto','scooter','ev_car','ev_moto','hybrid')),
  brand TEXT,
  model TEXT,
  year INT CHECK (year BETWEEN 1970 AND 2030),
  fuel_type TEXT CHECK (fuel_type IN ('petrol','diesel','electric','hybrid','plugin_hybrid','lpg','none')),
  license_plate_hash TEXT, -- SHA-256 hashed, never stored in clear
  is_primary BOOLEAN NOT NULL DEFAULT false,
  obd_paired BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vehicles_user_idx ON yana.vehicles(user_id);
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON yana.vehicles FOR EACH ROW EXECUTE FUNCTION yana.touch_updated_at();

-- 3.2 trips
CREATE TABLE IF NOT EXISTS yana.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES yana.vehicles(id) ON DELETE SET NULL,
  trip_mode TEXT NOT NULL DEFAULT 'solo' CHECK (trip_mode IN ('solo','carpool_driver','carpool_passenger')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  distance_km NUMERIC(10,3) NOT NULL DEFAULT 0,
  duration_sec INT NOT NULL DEFAULT 0,
  max_speed_kmh NUMERIC(5,2),
  avg_speed_kmh NUMERIC(5,2),
  safety_score INT CHECK (safety_score BETWEEN 0 AND 100),
  eco_score INT CHECK (eco_score BETWEEN 0 AND 100),
  co2_kg NUMERIC(8,3) NOT NULL DEFAULT 0,
  fuel_consumed_l NUMERIC(6,2),
  seeds_earned INT NOT NULL DEFAULT 0,
  euros_earned_cents INT NOT NULL DEFAULT 0,
  points_earned INT NOT NULL DEFAULT 0,
  passengers_count INT NOT NULL DEFAULT 0,
  route_polyline TEXT, -- encoded polyline, owner-only visible
  start_geohash TEXT,
  end_geohash TEXT,
  weather TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','cancelled','flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trips_user_idx ON yana.trips(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS trips_vehicle_idx ON yana.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON yana.trips(status);

-- 3.3 trip_events (harsh_brake, harsh_accel, sharp_turn, speeding, phone_use, fatigue_signal, break_missed, focus_maintained)
CREATE TABLE IF NOT EXISTS yana.trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES yana.trips(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('harsh_brake','harsh_accel','sharp_turn','speeding','phone_use','fatigue_signal','break_missed','focus_maintained','smooth_drive','eco_acceleration')),
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  lat_rounded NUMERIC(6,3), -- 3 decimals = ~100m precision (security M1)
  lng_rounded NUMERIC(7,3),
  speed_kmh NUMERIC(5,2),
  speed_limit_kmh NUMERIC(5,2),
  g_force NUMERIC(4,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trip_events_trip_idx ON yana.trip_events(trip_id);
CREATE INDEX IF NOT EXISTS trip_events_type_idx ON yana.trip_events(event_type);

-- 3.4 fatigue_sessions (HRV from HealthKit/Health Connect)
CREATE TABLE IF NOT EXISTS yana.fatigue_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES yana.trips(id) ON DELETE SET NULL,
  hrv_score INT CHECK (hrv_score BETWEEN 0 AND 100),
  sleep_score INT CHECK (sleep_score BETWEEN 0 AND 100),
  sleep_hours NUMERIC(3,1),
  break_recommended_at TIMESTAMPTZ,
  break_taken_at TIMESTAMPTZ,
  break_duration_min INT,
  source TEXT CHECK (source IN ('healthkit','health_connect','manual','computed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fatigue_user_idx ON yana.fatigue_sessions(user_id, created_at DESC);

-- 3.5 safe_driver_monthly_scores (aggregated for insurance eligibility)
CREATE TABLE IF NOT EXISTS yana.safe_driver_monthly_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  avg_safety_score NUMERIC(5,2),
  avg_eco_score NUMERIC(5,2),
  total_trips INT NOT NULL DEFAULT 0,
  total_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  insurance_discount_eligible BOOLEAN NOT NULL DEFAULT false,
  badge TEXT CHECK (badge IN ('gold','silver','bronze','learner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);
CREATE INDEX IF NOT EXISTS safe_driver_user_month_idx ON yana.safe_driver_monthly_scores(user_id, month DESC);

-- 3.6 carpools
CREATE TABLE IF NOT EXISTS yana.carpools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES yana.vehicles(id),
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  from_geohash TEXT NOT NULL,
  to_geohash TEXT NOT NULL,
  meeting_point_label TEXT,
  meeting_point_geohash TEXT, -- precise point revealed only after booking confirmed
  departure_at TIMESTAMPTZ NOT NULL,
  estimated_duration_min INT,
  seats_total INT NOT NULL CHECK (seats_total BETWEEN 1 AND 7),
  seats_remaining INT NOT NULL,
  price_per_seat_cents INT NOT NULL DEFAULT 0,
  prime_per_seat_cents INT NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','in_progress','completed','cancelled')),
  requires_kyc BOOLEAN NOT NULL DEFAULT true,
  women_only BOOLEAN NOT NULL DEFAULT false,
  silent_ride BOOLEAN NOT NULL DEFAULT false,
  pets_allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS carpools_departure_idx ON yana.carpools(departure_at) WHERE status='open';
CREATE INDEX IF NOT EXISTS carpools_from_geohash_idx ON yana.carpools(from_geohash);
CREATE INDEX IF NOT EXISTS carpools_to_geohash_idx ON yana.carpools(to_geohash);
CREATE INDEX IF NOT EXISTS carpools_driver_idx ON yana.carpools(driver_id);
CREATE TRIGGER carpools_touch BEFORE UPDATE ON yana.carpools FOR EACH ROW EXECUTE FUNCTION yana.touch_updated_at();

-- 3.7 carpool_bookings
CREATE TABLE IF NOT EXISTS yana.carpool_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carpool_id UUID NOT NULL REFERENCES yana.carpools(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  seats INT NOT NULL DEFAULT 1 CHECK (seats > 0),
  total_price_cents INT NOT NULL,
  total_prime_cents INT NOT NULL DEFAULT 0,
  driver_rating INT CHECK (driver_rating BETWEEN 1 AND 5),
  passenger_rating INT CHECK (passenger_rating BETWEEN 1 AND 5),
  driver_feedback TEXT,
  passenger_feedback TEXT,
  payout_driver_cents INT NOT NULL DEFAULT 0,
  payout_passenger_cents INT NOT NULL DEFAULT 0,
  payout_platform_cents INT NOT NULL DEFAULT 0,
  payout_eco_pool_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','disputed')),
  safe_walk_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(carpool_id, passenger_id)
);
CREATE INDEX IF NOT EXISTS carpool_bookings_passenger_idx ON yana.carpool_bookings(passenger_id);
CREATE INDEX IF NOT EXISTS carpool_bookings_carpool_idx ON yana.carpool_bookings(carpool_id);

-- 3.8 trees_planted
CREATE TABLE IF NOT EXISTS yana.trees_planted (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES yana.trips(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('tree_nation','ecosia','reforest_action','manual')),
  tree_count INT NOT NULL DEFAULT 1,
  co2_offset_kg NUMERIC(8,2) NOT NULL DEFAULT 0,
  cost_cents INT NOT NULL DEFAULT 0,
  certificate_url TEXT,
  ots_proof TEXT, -- OpenTimestamps SHA-256 blockchain proof
  planted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trees_user_idx ON yana.trees_planted(user_id, planted_at DESC);

-- 3.9 mobility_missions
CREATE TABLE IF NOT EXISTS yana.mobility_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL CHECK (category IN ('SELF','OTHERS','EARTH','REST')),
  pillar TEXT NOT NULL CHECK (pillar IN ('mental','corporel','financier','alimentaire','energetique','relationnel','informationnel')),
  seeds_reward INT NOT NULL DEFAULT 0,
  points_reward INT NOT NULL DEFAULT 0,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('sensors_auto','photo_ai','screen_time_native','peer','manual','system')),
  vehicle_type_filter TEXT[] DEFAULT ARRAY['car','moto','scooter','ev_car','ev_moto','hybrid'],
  max_per_day INT NOT NULL DEFAULT 1,
  max_total INT,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10 mission_completions
CREATE TABLE IF NOT EXISTS yana.mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES yana.mobility_missions(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES yana.trips(id) ON DELETE SET NULL,
  proof_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  proof_url TEXT,
  ai_confidence NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected','flagged')),
  seeds_credited INT NOT NULL DEFAULT 0,
  points_credited INT NOT NULL DEFAULT 0,
  validated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mission_completions_user_idx ON yana.mission_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS mission_completions_status_idx ON yana.mission_completions(status);

-- 3.11 co2_factors (seed ADEME)
CREATE TABLE IF NOT EXISTS yana.co2_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  kg_co2_per_km NUMERIC(6,4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'ADEME 2026',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(vehicle_type, fuel_type)
);

-- ═════════════════════════════════════════════════════════════════════
-- 4. TABLES — UNIVERSELS PURAMA (parrainage, wallet, points, karma jeux)
-- ═════════════════════════════════════════════════════════════════════

-- 4.1 referrals
CREATE TABLE IF NOT EXISTS yana.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  referred_id UUID UNIQUE REFERENCES yana.profiles(id) ON DELETE CASCADE,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','subscribed','expired','refunded')),
  first_payment_at TIMESTAMPTZ,
  commission_cents INT NOT NULL DEFAULT 0,
  tier INT NOT NULL DEFAULT 1 CHECK (tier IN (1,2,3)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON yana.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON yana.referrals(status);

-- 4.2 commissions
CREATE TABLE IF NOT EXISTS yana.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES yana.referrals(id) ON DELETE SET NULL,
  amount_cents INT NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('referral_n1','referral_n2','referral_n3','ambassador_bonus','tier_bonus','milestone')),
  source TEXT,
  stripe_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credited','paid_out','reverted')),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS commissions_user_idx ON yana.commissions(user_id, created_at DESC);

-- 4.3 wallet_transactions
CREATE TABLE IF NOT EXISTS yana.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  balance_after_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON yana.wallet_transactions(user_id, created_at DESC);

-- 4.4 withdrawals (min 5€, anti-double-retrait LEARNINGS #24)
CREATE TABLE IF NOT EXISTS yana.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL CHECK (amount_cents >= 500),
  iban_masked TEXT NOT NULL,
  iban_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT
);
CREATE INDEX IF NOT EXISTS withdrawals_user_status_idx ON yana.withdrawals(user_id, status);

-- 4.5 point_transactions
CREATE TABLE IF NOT EXISTS yana.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  reason TEXT NOT NULL,
  source TEXT,
  balance_after BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS point_tx_user_idx ON yana.point_transactions(user_id, created_at DESC);

-- 4.6 karma_tickets
CREATE TABLE IF NOT EXISTS yana.karma_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('signup','referral','mission','share','review','challenge','streak','subscription','points_purchase','daily')),
  draw_id UUID,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS karma_tickets_user_idx ON yana.karma_tickets(user_id);
CREATE INDEX IF NOT EXISTS karma_tickets_draw_idx ON yana.karma_tickets(draw_id);

-- 4.7 karma_draws (25 jeux KARMA)
CREATE TABLE IF NOT EXISTS yana.karma_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('dharma_wheel','collective_challenge','monthly_tournament','rare_quest','lightning_deals','jackpot_earth','pillar_mental','pillar_corporel','pillar_financier','pillar_bloom','pillar_autonomie','mirror','reader','lunar_cycle','mahatmas','invisible_gift','shadow_passage','resonance_369','grand_wheel','treasure_hunt','creative','living_heritage','masks','time_capsule','wave')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pool_cents INT NOT NULL DEFAULT 0,
  max_winners INT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed','cancelled')),
  random_org_signature TEXT,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.8 karma_winners
CREATE TABLE IF NOT EXISTS yana.karma_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES yana.karma_draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES yana.karma_tickets(id),
  rank INT NOT NULL,
  amount_cents INT NOT NULL DEFAULT 0,
  seeds_awarded INT NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS karma_winners_user_idx ON yana.karma_winners(user_id);

-- 4.9 achievements + user_achievements
CREATE TABLE IF NOT EXISTS yana.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  points_reward INT NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS yana.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES yana.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 4.10 cross_promos
CREATE TABLE IF NOT EXISTS yana.cross_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app TEXT NOT NULL,
  target_app TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  coupon_code TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.11 aides (45 aides FR mobilité seedées)
CREATE TABLE IF NOT EXISTS yana.aides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  type_aide TEXT NOT NULL,
  profil_eligible TEXT[] NOT NULL DEFAULT '{}',
  situation_eligible TEXT[] NOT NULL DEFAULT '{}',
  montant_max_eur INT,
  url_officielle TEXT,
  description TEXT NOT NULL,
  region TEXT,
  handicap_only BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════════
-- 5. TABLES — TRUST + SÉCURITÉ (KYC, fraud, pool economy)
-- ═════════════════════════════════════════════════════════════════════

-- 5.1 kyc_verifications (Onfido)
CREATE TABLE IF NOT EXISTS yana.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'onfido' CHECK (provider IN ('onfido','jumio','idnow')),
  applicant_id TEXT,
  check_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','approved','rejected','expired')),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('terra_nova_activation','carpool_first_booking')),
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5.2 onfido_webhook_events (idempotency)
CREATE TABLE IF NOT EXISTS yana.onfido_webhook_events (
  event_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.3 trust_events (score history)
CREATE TABLE IF NOT EXISTS yana.trust_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  score_change INT NOT NULL,
  score_after INT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.4 user_reports
CREATE TABLE IF NOT EXISTS yana.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  carpool_booking_id UUID REFERENCES yana.carpool_bookings(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','investigating','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.5 pool_balances + pool_transactions (CA split 50/10/40 VITAE §20)
CREATE TABLE IF NOT EXISTS yana.pool_balances (
  pool_type TEXT PRIMARY KEY CHECK (pool_type IN ('reward_users','asso_purama','sasu_purama','eco_trees')),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  total_in_cents BIGINT NOT NULL DEFAULT 0,
  total_out_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yana.pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type TEXT NOT NULL REFERENCES yana.pool_balances(pool_type),
  amount_cents BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════════
-- 6. TABLES — STRIPE + BILLING
-- ═════════════════════════════════════════════════════════════════════

-- 6.1 stripe_webhook_log (idempotency CRITIQUE C4)
CREATE TABLE IF NOT EXISTS yana.stripe_webhook_log (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.2 payments + invoices
CREATE TABLE IF NOT EXISTS yana.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yana.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  number TEXT UNIQUE NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.3 welcome_primes (L221-28 §21 paiement)
CREATE TABLE IF NOT EXISTS yana.welcome_primes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  total_cents INT NOT NULL DEFAULT 10000,
  tranche_1_cents INT NOT NULL DEFAULT 2500,
  tranche_1_paid_at TIMESTAMPTZ,
  tranche_2_cents INT NOT NULL DEFAULT 2500,
  tranche_2_paid_at TIMESTAMPTZ,
  tranche_3_cents INT NOT NULL DEFAULT 5000,
  tranche_3_paid_at TIMESTAMPTZ,
  withdrawal_unlocked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','refunded','cancelled'))
);

-- ═════════════════════════════════════════════════════════════════════
-- 7. TABLES — AI (NAMA-PILOTE chat)
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS yana.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON yana.conversations(user_id, updated_at DESC);
CREATE TRIGGER conversations_touch BEFORE UPDATE ON yana.conversations FOR EACH ROW EXECUTE FUNCTION yana.touch_updated_at();

CREATE TABLE IF NOT EXISTS yana.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES yana.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_input INT,
  tokens_output INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_conv_idx ON yana.messages(conversation_id, created_at);

-- ═════════════════════════════════════════════════════════════════════
-- 8. TABLES — SUPPORT + SPIRITUAL + COMMS
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS yana.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON yana.notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS yana.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES yana.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_by_ai BOOLEAN NOT NULL DEFAULT false,
  ai_response TEXT,
  escalated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yana.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS yana.faq_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  search_keywords TEXT[] DEFAULT '{}',
  view_count INT NOT NULL DEFAULT 0,
  helpful_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.1 affirmations (mobilité-spécifiques)
CREATE TABLE IF NOT EXISTS yana.affirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('love','power','abundance','health','wisdom','gratitude','journey','safety')),
  text_fr TEXT NOT NULL,
  text_en TEXT NOT NULL,
  frequency_weight INT NOT NULL DEFAULT 1
);

-- 8.2 awakening_events
CREATE TABLE IF NOT EXISTS yana.awakening_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  xp_gained INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.3 gratitude + intentions + breath_sessions
CREATE TABLE IF NOT EXISTS yana.gratitude_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  trip_id UUID REFERENCES yana.trips(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yana.intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  trip_id UUID REFERENCES yana.trips(id),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yana.breath_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL DEFAULT '4-7-8',
  duration_sec INT NOT NULL,
  trip_id UUID REFERENCES yana.trips(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.4 push_tokens
CREATE TABLE IF NOT EXISTS yana.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- ═════════════════════════════════════════════════════════════════════
-- 9. RLS — POLICIES (AKASHA pattern PATTERNS #4 : DO $$ + IF NOT EXISTS)
-- ═════════════════════════════════════════════════════════════════════

ALTER TABLE yana.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.trip_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.fatigue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.safe_driver_monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.carpools ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.carpool_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.trees_planted ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.mobility_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.co2_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.karma_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.karma_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.karma_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.cross_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.aides ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.onfido_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.trust_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.pool_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.pool_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.stripe_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.welcome_primes ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.affirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.awakening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.breath_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- profiles : user sees/edits own, super_admin sees all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='profiles' AND policyname='profiles_self_select') THEN
    CREATE POLICY profiles_self_select ON yana.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR EXISTS (SELECT 1 FROM yana.profiles p WHERE p.id = auth.uid() AND p.role='super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='profiles' AND policyname='profiles_self_update') THEN
    CREATE POLICY profiles_self_update ON yana.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;

  -- vehicles : own only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='vehicles' AND policyname='vehicles_owner_all') THEN
    CREATE POLICY vehicles_owner_all ON yana.vehicles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- trips : own only, status + route_polyline not in SELECT to others via API layer
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='trips' AND policyname='trips_owner_all') THEN
    CREATE POLICY trips_owner_all ON yana.trips FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- trip_events : via trips ownership
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='trip_events' AND policyname='trip_events_owner_all') THEN
    CREATE POLICY trip_events_owner_all ON yana.trip_events FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM yana.trips t WHERE t.id = trip_events.trip_id AND t.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM yana.trips t WHERE t.id = trip_events.trip_id AND t.user_id = auth.uid()));
  END IF;

  -- fatigue_sessions : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='fatigue_sessions' AND policyname='fatigue_owner_all') THEN
    CREATE POLICY fatigue_owner_all ON yana.fatigue_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- safe_driver_monthly_scores : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='safe_driver_monthly_scores' AND policyname='safe_driver_owner_select') THEN
    CREATE POLICY safe_driver_owner_select ON yana.safe_driver_monthly_scores FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- carpools : all authenticated can SELECT open carpools, only driver can INSERT/UPDATE/DELETE own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='carpools' AND policyname='carpools_public_select_open') THEN
    CREATE POLICY carpools_public_select_open ON yana.carpools FOR SELECT TO authenticated USING (status IN ('open','full','in_progress','completed') OR driver_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='carpools' AND policyname='carpools_driver_write') THEN
    CREATE POLICY carpools_driver_write ON yana.carpools FOR ALL TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
  END IF;

  -- carpool_bookings : passenger or driver
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='carpool_bookings' AND policyname='carpool_bookings_party_select') THEN
    CREATE POLICY carpool_bookings_party_select ON yana.carpool_bookings FOR SELECT TO authenticated
      USING (passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM yana.carpools c WHERE c.id = carpool_bookings.carpool_id AND c.driver_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='carpool_bookings' AND policyname='carpool_bookings_passenger_insert') THEN
    CREATE POLICY carpool_bookings_passenger_insert ON yana.carpool_bookings FOR INSERT TO authenticated WITH CHECK (passenger_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='carpool_bookings' AND policyname='carpool_bookings_party_update') THEN
    CREATE POLICY carpool_bookings_party_update ON yana.carpool_bookings FOR UPDATE TO authenticated
      USING (passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM yana.carpools c WHERE c.id = carpool_bookings.carpool_id AND c.driver_id = auth.uid()));
  END IF;

  -- trees_planted : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='trees_planted' AND policyname='trees_owner_select') THEN
    CREATE POLICY trees_owner_select ON yana.trees_planted FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- mobility_missions : public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='mobility_missions' AND policyname='missions_public_select') THEN
    CREATE POLICY missions_public_select ON yana.mobility_missions FOR SELECT TO anon, authenticated USING (active = true);
  END IF;

  -- mission_completions : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='mission_completions' AND policyname='mission_completions_owner') THEN
    CREATE POLICY mission_completions_owner ON yana.mission_completions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- co2_factors : public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='co2_factors' AND policyname='co2_factors_public_select') THEN
    CREATE POLICY co2_factors_public_select ON yana.co2_factors FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- referrals : own (as referrer OR referred)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='referrals' AND policyname='referrals_party_select') THEN
    CREATE POLICY referrals_party_select ON yana.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
  END IF;

  -- commissions : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='commissions' AND policyname='commissions_owner_select') THEN
    CREATE POLICY commissions_owner_select ON yana.commissions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- wallet_transactions : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='wallet_transactions' AND policyname='wallet_tx_owner_select') THEN
    CREATE POLICY wallet_tx_owner_select ON yana.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- withdrawals : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='withdrawals' AND policyname='withdrawals_owner_all') THEN
    CREATE POLICY withdrawals_owner_all ON yana.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- point_transactions : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='point_transactions' AND policyname='point_tx_owner_select') THEN
    CREATE POLICY point_tx_owner_select ON yana.point_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- karma_tickets : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='karma_tickets' AND policyname='karma_tickets_owner') THEN
    CREATE POLICY karma_tickets_owner ON yana.karma_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- karma_draws : public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='karma_draws' AND policyname='karma_draws_public_select') THEN
    CREATE POLICY karma_draws_public_select ON yana.karma_draws FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- karma_winners : public read (anonymised via API) + own full
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='karma_winners' AND policyname='karma_winners_public_select') THEN
    CREATE POLICY karma_winners_public_select ON yana.karma_winners FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- achievements : public
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='achievements' AND policyname='achievements_public_select') THEN
    CREATE POLICY achievements_public_select ON yana.achievements FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- user_achievements : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='user_achievements' AND policyname='user_achievements_owner') THEN
    CREATE POLICY user_achievements_owner ON yana.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- cross_promos : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='cross_promos' AND policyname='cross_promos_owner') THEN
    CREATE POLICY cross_promos_owner ON yana.cross_promos FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- aides : public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='aides' AND policyname='aides_public_select') THEN
    CREATE POLICY aides_public_select ON yana.aides FOR SELECT TO anon, authenticated USING (active = true);
  END IF;

  -- kyc_verifications : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='kyc_verifications' AND policyname='kyc_owner_select') THEN
    CREATE POLICY kyc_owner_select ON yana.kyc_verifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- onfido_webhook_events : no client access (service_role only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='onfido_webhook_events' AND policyname='onfido_webhook_deny_all') THEN
    CREATE POLICY onfido_webhook_deny_all ON yana.onfido_webhook_events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;

  -- trust_events : own read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='trust_events' AND policyname='trust_events_owner') THEN
    CREATE POLICY trust_events_owner ON yana.trust_events FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- user_reports : own read + insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='user_reports' AND policyname='user_reports_reporter_all') THEN
    CREATE POLICY user_reports_reporter_all ON yana.user_reports FOR ALL TO authenticated USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());
  END IF;

  -- pool_balances / pool_transactions : service_role only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='pool_balances' AND policyname='pool_balances_deny_all') THEN
    CREATE POLICY pool_balances_deny_all ON yana.pool_balances FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='pool_transactions' AND policyname='pool_tx_deny_all') THEN
    CREATE POLICY pool_tx_deny_all ON yana.pool_transactions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;

  -- stripe_webhook_log / payments / invoices : service_role only for log; owner read for payments/invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='stripe_webhook_log' AND policyname='stripe_log_deny_all') THEN
    CREATE POLICY stripe_log_deny_all ON yana.stripe_webhook_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='payments' AND policyname='payments_owner') THEN
    CREATE POLICY payments_owner ON yana.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='invoices' AND policyname='invoices_owner') THEN
    CREATE POLICY invoices_owner ON yana.invoices FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='welcome_primes' AND policyname='welcome_primes_owner') THEN
    CREATE POLICY welcome_primes_owner ON yana.welcome_primes FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- conversations + messages : owner via conversation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='conversations' AND policyname='conversations_owner_all') THEN
    CREATE POLICY conversations_owner_all ON yana.conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='messages' AND policyname='messages_owner_all') THEN
    CREATE POLICY messages_owner_all ON yana.messages FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM yana.conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM yana.conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));
  END IF;

  -- notifications : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='notifications' AND policyname='notifications_owner') THEN
    CREATE POLICY notifications_owner ON yana.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- support_tickets : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='support_tickets' AND policyname='support_tickets_owner') THEN
    CREATE POLICY support_tickets_owner ON yana.support_tickets FOR ALL TO authenticated USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;

  -- contact_messages : anyone can INSERT (form contact public), service_role reads
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='contact_messages' AND policyname='contact_messages_public_insert') THEN
    CREATE POLICY contact_messages_public_insert ON yana.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  -- faq_articles : public
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='faq_articles' AND policyname='faq_public_select') THEN
    CREATE POLICY faq_public_select ON yana.faq_articles FOR SELECT TO anon, authenticated USING (active = true);
  END IF;

  -- affirmations : public
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='affirmations' AND policyname='affirmations_public_select') THEN
    CREATE POLICY affirmations_public_select ON yana.affirmations FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- awakening_events : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='awakening_events' AND policyname='awakening_events_owner') THEN
    CREATE POLICY awakening_events_owner ON yana.awakening_events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- gratitude_entries + intentions + breath_sessions : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='gratitude_entries' AND policyname='gratitude_owner') THEN
    CREATE POLICY gratitude_owner ON yana.gratitude_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='intentions' AND policyname='intentions_owner') THEN
    CREATE POLICY intentions_owner ON yana.intentions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='breath_sessions' AND policyname='breath_sessions_owner') THEN
    CREATE POLICY breath_sessions_owner ON yana.breath_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- push_tokens : own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='push_tokens' AND policyname='push_tokens_owner') THEN
    CREATE POLICY push_tokens_owner ON yana.push_tokens FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════
-- 10. SEED DATA
-- ═════════════════════════════════════════════════════════════════════

-- 10.1 pool_balances init
INSERT INTO yana.pool_balances (pool_type) VALUES ('reward_users'), ('asso_purama'), ('sasu_purama'), ('eco_trees')
ON CONFLICT (pool_type) DO NOTHING;

-- 10.2 CO2 factors ADEME officielles (kg CO2 eq / km)
INSERT INTO yana.co2_factors (vehicle_type, fuel_type, kg_co2_per_km, source) VALUES
  ('car','petrol',0.1920,'ADEME 2026 — voiture thermique essence'),
  ('car','diesel',0.1710,'ADEME 2026 — voiture thermique diesel'),
  ('car','electric',0.0350,'ADEME 2026 — voiture électrique mix FR'),
  ('car','hybrid',0.1100,'ADEME 2026 — voiture hybride'),
  ('car','plugin_hybrid',0.0780,'ADEME 2026 — hybride rechargeable'),
  ('car','lpg',0.1600,'ADEME 2026 — GPL'),
  ('ev_car','electric',0.0350,'ADEME 2026 — VE'),
  ('moto','petrol',0.1100,'ADEME 2026 — moto essence'),
  ('scooter','petrol',0.0650,'ADEME 2026 — scooter essence'),
  ('ev_moto','electric',0.0150,'ADEME 2026 — 2-roues électrique'),
  ('hybrid','hybrid',0.1100,'ADEME 2026')
ON CONFLICT (vehicle_type, fuel_type) DO NOTHING;

-- 10.3 affirmations mobilité (18 entries)
INSERT INTO yana.affirmations (category, text_fr, text_en, frequency_weight) VALUES
  ('journey','Chaque trajet est un chapitre de ma légende','Every trip is a chapter of my legend',3),
  ('safety','Je conduis avec la sérénité d''un moine zen','I drive with the serenity of a zen monk',3),
  ('journey','La route m''enseigne la patience et la présence','The road teaches me patience and presence',2),
  ('safety','Ma vie vaut plus que quelques minutes gagnées','My life is worth more than minutes saved',3),
  ('gratitude','Je remercie ce véhicule de me porter','I thank this vehicle for carrying me',1),
  ('wisdom','Le voyage est aussi important que la destination','The journey matters as much as the destination',2),
  ('power','Chaque kilomètre parcouru en conscience me libère','Every mindful kilometer frees me',2),
  ('safety','Mes réflexes sont affûtés, mon attention totale','My reflexes are sharp, my attention total',3),
  ('abundance','Conduire vert, c''est enrichir la Terre','Driving green enriches the Earth',2),
  ('journey','Je ne cours pas après le temps, je danse avec lui','I don''t chase time, I dance with it',1),
  ('wisdom','Un conducteur calme crée un monde plus calme','A calm driver creates a calmer world',2),
  ('gratitude','Merci à chaque passager pour sa confiance','Thank you to each passenger for their trust',2),
  ('power','Ma conduite est une méditation en mouvement','My driving is meditation in motion',2),
  ('safety','Je laisse les agressés à leurs blessures','I leave the aggressive to their wounds',2),
  ('journey','Le chemin se trace sous mes roues','The path draws itself under my wheels',1),
  ('love','J''aime ceux qui m''attendent à l''arrivée','I love those who wait for me at arrival',3),
  ('wisdom','La meilleure route est celle du retour à soi','The best road is the one back to oneself',1),
  ('safety','J''arrive — telle est ma seule mission','I arrive — this is my only mission',3)
ON CONFLICT DO NOTHING;

-- 10.4 mobility_missions (8 missions core YANA)
INSERT INTO yana.mobility_missions (slug, title, description, icon, category, pillar, seeds_reward, points_reward, verification_type, max_per_day, priority) VALUES
  ('trajet-zen','Trajet Zen','0 freinage brusque ni accélération violente sur 30 minutes de conduite','🧘','SELF','corporel',50,100,'sensors_auto',3,10),
  ('eco-pilote','Éco-Pilote','Consommation <6L/100km ou -15% vs ta moyenne sur un trajet ≥50km','🌱','EARTH','energetique',80,150,'sensors_auto',2,20),
  ('premiere-fois-carpool','Premier Covoiturage','Effectue ton premier trajet en covoiturage (chauffeur ou passager)','🚗','OTHERS','relationnel',100,300,'system',1,5),
  ('pause-sage','Pause Sage','15 minutes de pause après 2h consécutives de conduite','💤','REST','corporel',30,80,'sensors_auto',2,30),
  ('moto-kit-complet','Moto Safe','Casque + gants + blouson + protections complètes visibles (photo IA)','🏍️','SELF','corporel',40,100,'photo_ai',1,40),
  ('zero-phone','Mode Focus','Zéro manipulation du téléphone pendant toute la durée du trajet','📵','SELF','informationnel',70,150,'screen_time_native',3,25),
  ('off-peak-drive','Off-Peak','Éviter les pics de pollution (7h-9h et 17h-19h)','🌿','EARTH','energetique',60,120,'sensors_auto',2,50),
  ('mentor-nouveau-conducteur','Mentor de Route','Accompagner un jeune conducteur (<1 an de permis) sur un trajet','🤝','OTHERS','relationnel',200,500,'peer',1,60)
ON CONFLICT (slug) DO NOTHING;

-- 10.5 achievements mobilité (15 achievements)
INSERT INTO yana.achievements (slug, title, description, icon, points_reward, rarity, condition_json) VALUES
  ('zen-driver-7d','Zen Driver','7 jours consécutifs avec score safety ≥90','🧘',500,'rare','{"streak_days":7,"min_safety_score":90}'),
  ('eco-warrior','Eco Warrior','Compenser 100kg de CO₂ par des trajets éco','🌳',1000,'epic','{"co2_offset_kg":100}'),
  ('carpool-master','Carpool Master','50 covoiturages complétés','🚗',2000,'epic','{"carpool_completions":50}'),
  ('premier-trajet','Premier Trajet','Finir ton premier trajet','🚦',50,'common','{"total_trips":1}'),
  ('marathon-1000','Marathon 1000','1000 km cumulés en conduite safe','🏁',1500,'rare','{"total_km":1000,"min_safety_score":80}'),
  ('forest-builder','Bâtisseur de Forêt','10 arbres plantés','🌲',800,'rare','{"trees_planted":10}'),
  ('streak-30','Streak de 30','30 jours de trajets conscients','🔥',3000,'legendary','{"streak_days":30}'),
  ('night-rider','Night Rider','10 trajets nocturnes (23h-5h) safe','🌙',600,'rare','{"night_trips":10}'),
  ('solo-mahatma','Solo Mahatma','Atteindre niveau Mahatma (100K Graines)','💎',5000,'legendary','{"seeds_balance":100000}'),
  ('first-referral','Premier Filleul','Faire inscrire ton premier filleul','🎁',300,'common','{"referrals_count":1}'),
  ('zen-moto','Zen Moto','20 trajets moto avec équipement complet','🏍️',1000,'rare','{"moto_kit_trips":20}'),
  ('rush-hour-avoider','Anti-Bouchons','20 missions Off-Peak réussies','⏰',700,'rare','{"off_peak_completions":20}'),
  ('phone-free','Phone Free','50 missions Mode Focus réussies','📵',1500,'epic','{"zero_phone_completions":50}'),
  ('mentor-5','Guide','5 jeunes conducteurs mentorés','🧭',2500,'epic','{"mentor_completions":5}'),
  ('jackpot-terre','Jackpot Terre','Gagner un Jackpot Terre','🌍',10000,'legendary','{"jackpot_terre_won":1}')
ON CONFLICT (slug) DO NOTHING;

-- 10.6 aides mobilité FR (45 aides SEED)
INSERT INTO yana.aides (slug, nom, type_aide, profil_eligible, situation_eligible, montant_max_eur, url_officielle, description, region, handicap_only) VALUES
  ('bonus-ecologique-vp','Bonus écologique voiture électrique','prime','{particulier}','{achat_vehicule}',7000,'https://www.service-public.fr/particuliers/vosdroits/F34014','Aide à l''achat d''un véhicule électrique neuf (plafond selon revenus)','national',false),
  ('bonus-ecologique-2roues','Bonus écologique 2-roues électrique','prime','{particulier}','{achat_vehicule}',900,'https://www.service-public.fr/particuliers/vosdroits/F34015','Aide à l''achat d''un deux-roues électrique neuf','national',false),
  ('prime-conversion','Prime à la conversion','prime','{particulier,professionnel}','{achat_vehicule,mise_au_rebut}',5000,'https://www.service-public.fr/particuliers/vosdroits/F34017','Prime pour l''achat d''un véhicule moins polluant avec mise au rebut ancien','national',false),
  ('prime-retrofit','Prime rétrofit électrique','prime','{particulier}','{conversion_vehicule}',6000,'https://www.service-public.fr/particuliers/vosdroits/F34018','Aide à la conversion d''un véhicule thermique en électrique','national',false),
  ('aide-crit-air','Aide Crit''Air ZFE','prime','{particulier}','{zfe}',4000,'https://www.service-public.fr/particuliers/vosdroits/F35014','Aide pour véhicule Crit''Air 0,1,2 dans ZFE','national',false),
  ('forfait-mobilite-durable','Forfait Mobilité Durable','prise_en_charge','{salarie}','{trajet_domicile_travail}',800,'https://www.service-public.fr/particuliers/vosdroits/F35020','Prise en charge employeur des trajets domicile-travail (vélo, covoit, etc.)','national',false),
  ('prime-permis-apprentissage','Prime permis apprenti','prime','{jeune,apprenti}','{passage_permis}',500,'https://www.service-public.fr/particuliers/vosdroits/F35026','Aide de 500€ pour passer le permis B','national',false),
  ('permis-1euro','Permis à 1€ par jour','pret','{jeune}','{passage_permis}',1200,'https://www.permisaunEuroParJour.gouv.fr','Prêt à taux zéro pour financer le permis','national',false),
  ('aah-mobilite','AAH Mobilité','allocation','{handicape}','{mobilite_reduite}',1200,'https://www.service-public.fr/particuliers/vosdroits/F12242','Aide pour l''adaptation du véhicule aux personnes en situation de handicap','national',true),
  ('pch-mobilite','PCH Aménagement véhicule','prise_en_charge','{handicape}','{mobilite_reduite}',5000,'https://www.service-public.fr/particuliers/vosdroits/F14202','Prestation de compensation du handicap — aménagement véhicule','national',true),
  ('aide-permis-handicap','Aide permis handicap','prime','{handicape}','{passage_permis}',1200,'https://www.agefiph.fr','Financement du permis adapté pour personnes handicapées','national',true),
  ('chauffeur-solidaire-mdph','Transport solidaire MDPH','allocation','{handicape,senior}','{isolement}',300,'https://www.mdph.fr','Aide au transport pour personnes isolées','national',false),
  ('aide-covoit-maif','Aide covoiturage MAIF','remise','{particulier}','{covoiturage}',100,'https://www.maif.fr','Remise assurance covoitureurs MAIF','national',false),
  ('chq-energie-mobilite','Chèque énergie mobilité','cheque','{precaire}','{carburant}',277,'https://www.chequeenergie.gouv.fr','Chèque énergie utilisable pour le carburant','national',false),
  ('fsl-transport','FSL Transport','allocation','{precaire}','{trajet_domicile_travail}',500,'https://www.service-public.fr/particuliers/vosdroits/F1334','Fonds solidarité logement — volet transport','national',false),
  ('ik-velo-employeur','Indemnité kilométrique vélo','prise_en_charge','{salarie}','{trajet_domicile_travail}',500,'https://www.service-public.fr/particuliers/vosdroits/F20531','Indemnité employeur pour trajets à vélo','national',false),
  ('bonus-ile-de-france','Prime véhicule propre Île-de-France','prime','{particulier}','{achat_vehicule}',6000,'https://www.iledefrance.fr','Aide IdF pour achat véhicule propre (cumulable bonus national)','ile-de-france',false),
  ('bonus-paca','Prime véhicule propre PACA','prime','{particulier}','{achat_vehicule}',5000,'https://www.maregionsud.fr','Aide PACA pour achat VE ou hybride','paca',false),
  ('bonus-auvergne-rhone-alpes','Prime véhicule propre Auvergne-Rhône-Alpes','prime','{particulier}','{achat_vehicule}',4000,'https://www.auvergnerhonealpes.fr','Aide ARA pour achat VE','auvergne-rhone-alpes',false),
  ('bonus-grand-est','Prime véhicule propre Grand Est','prime','{particulier}','{achat_vehicule}',3000,'https://www.grandest.fr','Aide Grand Est pour achat VE','grand-est',false),
  ('bonus-occitanie','Éco-chèque mobilité Occitanie','prime','{particulier}','{achat_vehicule}',4000,'https://www.laregion.fr','Aide Occitanie véhicule propre','occitanie',false),
  ('bonus-bretagne','Prime véhicule propre Bretagne','prime','{particulier}','{achat_vehicule}',2000,'https://www.bretagne.bzh','Aide Bretagne véhicule propre','bretagne',false),
  ('bonus-normandie','Chèque éco-mobilité Normandie','prime','{particulier}','{achat_vehicule}',3500,'https://www.normandie.fr','Aide Normandie pour véhicule propre','normandie',false),
  ('aide-carburant-carsat','Aide carburant CARSAT','allocation','{senior,precaire}','{carburant}',150,'https://www.lassuranceretraite.fr','Aide ponctuelle carburant retraités','national',false),
  ('aide-caf-transport','Aide CAF transport','allocation','{parent_isole}','{trajet_famille}',200,'https://www.caf.fr','Aide ponctuelle CAF transport famille','national',false),
  ('aide-msa-transport','Aide MSA transport','allocation','{agriculteur}','{trajet_domicile_travail}',300,'https://www.msa.fr','Aide MSA pour agriculteurs','national',false),
  ('aide-ccas','Aide CCAS transport','allocation','{precaire}','{isolement}',200,'https://mairie.fr/ccas','CCAS local aide transport','national',false),
  ('pole-emploi-permis','Aide permis Pôle Emploi','prime','{demandeur_emploi}','{passage_permis}',1200,'https://www.pole-emploi.fr','Financement permis pour demandeurs d''emploi','national',false),
  ('aide-afpa-permis','AFPA — Permis stagiaire','prime','{stagiaire}','{passage_permis}',1200,'https://www.afpa.fr','Financement permis pour stagiaires formation pro','national',false),
  ('mission-locale-permis','Mission Locale Permis','prime','{jeune}','{passage_permis}',1200,'https://www.missions-locales.org','Mission Locale aide permis jeunes 16-25','national',false),
  ('agefiph-permis','AGEFIPH Permis handicap','prime','{handicape,demandeur_emploi}','{passage_permis}',1500,'https://www.agefiph.fr','Financement permis pour personnes handicapées DE','national',true),
  ('fiphfp-permis','FIPHFP Permis handicap public','prime','{handicape,fonctionnaire}','{passage_permis}',1500,'https://www.fiphfp.fr','Financement permis pour handicapés fonction publique','national',true),
  ('cnam-transport-ald','Transport ALD','prise_en_charge','{malade_chronique}','{soins_reguliers}',100,'https://www.ameli.fr','Remboursement transport médical ALD','national',false),
  ('vsl-ald','VSL Véhicule Sanitaire Léger','prise_en_charge','{malade}','{trajet_medical}',100,'https://www.ameli.fr','Transport sanitaire pris en charge','national',false),
  ('ameli-medical-transport','Remboursement transport médical','prise_en_charge','{patient}','{trajet_medical}',100,'https://www.ameli.fr','Remboursement transports médicaux sur prescription','national',false),
  ('aide-isolement-senior','Aide isolement senior','allocation','{senior}','{isolement}',500,'https://www.monalisa-asso.fr','Aide transport pour seniors isolés','national',false),
  ('chq-mobilite-pro','Chèque Mobilité Pro','cheque','{salarie}','{trajet_domicile_travail}',300,'https://www.urssaf.fr','Chèque mobilité employeur (exonéré charges)','national',false),
  ('ticket-mobilite-employeur','Ticket Mobilité','cheque','{salarie}','{trajet_domicile_travail}',200,'https://www.urssaf.fr','Ticket mobilité sous forme dématérialisée','national',false),
  ('aide-carburant-2024','Indemnité carburant 2026','prime','{travailleur}','{carburant}',100,'https://www.service-public.fr','Indemnité carburant travailleurs modestes','national',false),
  ('prime-covoiturage-ministere','Prime covoiturage 100€','prime','{particulier}','{covoiturage}',100,'https://www.ecologie.gouv.fr','Prime de 100€ pour démarrer le covoiturage (conducteur)','national',false),
  ('aide-achat-velo','Aide achat vélo','prime','{particulier}','{achat_vehicule}',400,'https://www.ecologie.gouv.fr','Bonus vélo électrique ou cargo','national',false),
  ('aide-abandon-voiture','Prime abandon voiture','prime','{particulier}','{mise_au_rebut}',3000,'https://www.ecologie.gouv.fr','Prime pour abandon voiture thermique','national',false),
  ('aide-borne-recharge','Crédit d''impôt borne recharge','credit_impot','{particulier}','{achat_equipement}',500,'https://www.service-public.fr/particuliers/vosdroits/F34010','Crédit d''impôt pour installation borne recharge domicile','national',false),
  ('aide-tgv-jeunes','TGV Jeune — abonnement','reduction','{jeune}','{trajet_loisirs}',500,'https://www.sncf-connect.com','Carte Avantage Jeune SNCF','national',false),
  ('aide-ecoles-conduite-sociale','Éco-école conduite sociale','prime','{precaire}','{passage_permis}',800,'https://www.ceser.fr','Tarifs solidaires écoles de conduite conventionnées','national',false)
ON CONFLICT (slug) DO NOTHING;

-- 10.7 FAQ mobilité (15 entries seed)
INSERT INTO yana.faq_articles (category, question, answer, search_keywords, priority) VALUES
  ('demarrage','Comment démarrer un trajet ?','Depuis le dashboard, appuie sur le gros bouton "Démarrer" en bas. YANA active le GPS + l''accéléromètre automatiquement. Tu n''as rien à faire d''autre que conduire tranquillement. À l''arrivée, tape "Terminer" — le score se calcule en 3 secondes.','{demarrer,commencer,trajet,trip,start}',10),
  ('safety-score','Comment est calculé mon score de sécurité ?','Le score va de 0 à 100. On part de 100 et on déduit des points à chaque événement risqué : freinage brusque (-3), accélération violente (-2), virage trop serré (-2), excès de vitesse (-5), téléphone détecté (-10). Plus ta conduite est fluide, plus tu gagnes de Graines et d''euros.','{score,safety,securite,note}',15),
  ('graines','Comment je gagne des Graines 🌱 ?','Les Graines sont la monnaie PURAMA. Tu en gagnes en : complétant des missions (Trajet Zen, Éco-Pilote, Covoiturage...), terminant un trajet avec un score ≥80, plantant un arbre, partageant un trajet avec un passager. 1 Graine ≈ 0,01€ utilisable dans la Marketplace.','{graines,monnaie,seeds,reward}',20),
  ('covoiturage','Comment fonctionne le covoiturage DUAL Reward ?','Unique à YANA : le conducteur ET le passager gagnent des Graines + des euros pour un trajet partagé. Le prix que paie le passager est réparti 80% conducteur + 15% plateforme + 5% pool écologique (plantation auto). Chacun reçoit 50 Graines × ton multiplicateur de plan.','{covoiturage,carpool,dual,partage}',25),
  ('tree-planting','Comment sont plantés les arbres ?','À chaque tranche de 10 kg de CO₂ compensés (via Éco-Pilote, covoiturage, off-peak), YANA plante 1 vrai arbre via Tree-Nation ou Ecosia. Tu reçois un certificat authentifié par blockchain OpenTimestamps. Ta forêt personnelle grandit dans l''onglet /green.','{arbres,tree,planter,co2,environnement}',30),
  ('kyc','Pourquoi demander une vérification d''identité ?','Uniquement si tu actives le covoiturage en vrai. C''est pour protéger tout le monde : personne ne monte dans ta voiture (ou tu ne montes chez personne) sans que les 2 identités soient vérifiées. Via Onfido (CNI + selfie, 2 minutes). Pour tout le reste de YANA, pas besoin de KYC.','{kyc,verification,identite,onfido}',35),
  ('fatigue','Comment YANA détecte la fatigue ?','Si tu autorises l''accès Apple Health ou Health Connect, YANA lit ton HRV (variabilité cardiaque) et ta qualité de sommeil. Après 2h de conduite, si un signe de fatigue est détecté, NAMA-PILOTE te propose une pause — mission "Pause Sage" à la clé.','{fatigue,sommeil,hrv,sante}',40),
  ('moto','Y a-t-il un Mode Moto spécial ?','Oui. Le Mode Moto simplifie encore l''écran (3 gros boutons, 0 distraction, notifications en vibration uniquement, NAMA vocale obligatoire). La mission "Moto Safe" te récompense quand tu portes casque + gants + blouson + protections complètes (photo IA vérification).','{moto,2roues,casque,equipement}',45),
  ('permis-points','Comment fonctionne le suivi permis à points ?','Opt-in uniquement. Tu saisis manuellement ton solde actuel (YANA n''a pas d''accès API à l''ANTS). On te prévient quand une action pourrait coûter un point (excès détecté). Aucune donnée partagée avec l''assurance ou les autorités.','{permis,points,ants}',50),
  ('assurance','Y a-t-il une remise d''assurance ?','YANA récompense la conduite sûre par un score mensuel. Ton score peut te rendre éligible à des remises chez des assureurs partenaires (en cours de partenariats). Pour l''instant : tu reçois un "Safe Driver Badge" exportable.','{assurance,remise,discount}',55),
  ('facturation','Comment changer mon abonnement ?','Va dans /settings/abonnement. Tu vois ton plan actuel, tes avantages, et tu peux upgrader ou résilier (3 étapes, 30s). Résiliation effective à la fin de la période déjà payée.','{abonnement,plan,resilier,change}',60),
  ('retrait-wallet','Comment retirer mes gains ?','Dès 5€ dans ton wallet, tu peux demander un retrait SEPA IBAN. Va dans /wallet → "Demander un retrait". Traité en 3-5 jours ouvrés. Premier retrait bloqué 30 jours après le début d''abonnement (loi L221-28).','{retrait,wallet,iban,argent}',65),
  ('parrainage','Comment fonctionne le parrainage ?','Chaque user a un code unique. Partage-le — quand un filleul s''abonne, tu touches 50% de son premier paiement + 10% à vie. 3 niveaux de profondeur. Dashboard : /referral.','{parrainage,referral,code,filleul}',70),
  ('erreur-gps','Mon GPS ne démarre pas','Vérifie : (1) iOS → Réglages → YANA → Position → "Toujours", (2) Android → Paramètres → Apps → YANA → Autorisations → Localisation "Autoriser en continu". Redémarre l''app. Si persistant : /aide → contact.','{gps,erreur,localisation}',75),
  ('suppression-compte','Comment supprimer mon compte ?','/settings → Confidentialité → "Supprimer mon compte". Tes données sont effacées sous 30j (RGPD). Ton wallet positif est viré à l''IBAN renseigné avant suppression.','{suppression,rgpd,compte}',80)
ON CONFLICT DO NOTHING;

-- 10.8 Super admin seed (Tissma)
-- NOTE: executé côté service_role, pas via RLS
-- Profile sera auto-créé par trigger handle_new_user lors du signup auth.users
-- Ici on prépare juste le UPDATE idempotent pour quand il signup
DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'matiss.frasne@gmail.com';
  IF v_user_id IS NOT NULL THEN
    UPDATE yana.profiles
    SET role='super_admin', plan='legende', plan_multiplier=10, credits=999999, purama_points=999999, wallet_balance_cents=0
    WHERE id = v_user_id;
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════
-- 11. NOTIFY PostgREST reload
-- ═════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

-- ═════════════════════════════════════════════════════════════════════
-- FIN schema.sql YANA v1.0
-- Pour vérifier : curl -H "Accept-Profile: yana" https://auth.purama.dev/rest/v1/profiles?limit=1
-- ═════════════════════════════════════════════════════════════════════
