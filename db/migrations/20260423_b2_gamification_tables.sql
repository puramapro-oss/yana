-- P3 Session B2 — gamification tables + seeds boutique

-- ──────────────────────────────────────────────────────────────────
-- daily_gifts : 1 ouverture par 24h par user (enforced par fn atomique)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yana.daily_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  gift_type text NOT NULL,
  gift_value integer NOT NULL DEFAULT 0,
  streak_count integer NOT NULL DEFAULT 1,
  opened_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_gifts_type_check CHECK (gift_type IN ('points', 'coupon_percent', 'ticket', 'credits', 'jackpot'))
);

CREATE INDEX IF NOT EXISTS daily_gifts_user_date_idx ON yana.daily_gifts(user_id, opened_at DESC);

ALTER TABLE yana.daily_gifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_gifts_owner_select ON yana.daily_gifts;
CREATE POLICY daily_gifts_owner_select ON yana.daily_gifts FOR SELECT TO authenticated USING (user_id = uid());

-- ──────────────────────────────────────────────────────────────────
-- point_shop_items : catalogue (déréférencé à la hausse via seed)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yana.point_shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  cost_points bigint NOT NULL CHECK (cost_points > 0),
  item_type text NOT NULL,
  value_cents integer,
  discount_percent integer,
  duration_days integer,
  target_plan text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_item_type_check CHECK (item_type IN ('discount_coupon','free_month','cash_credit','referral_boost','feature_unlock'))
);

ALTER TABLE yana.point_shop_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_items_public_select ON yana.point_shop_items;
CREATE POLICY shop_items_public_select ON yana.point_shop_items FOR SELECT TO anon, authenticated USING (active = true);

-- ──────────────────────────────────────────────────────────────────
-- point_purchases : log achats boutique (immutable)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yana.point_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES yana.point_shop_items(id),
  points_spent bigint NOT NULL,
  coupon_code text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_purchases_user_idx ON yana.point_purchases(user_id, created_at DESC);

ALTER TABLE yana.point_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS point_purchases_owner_select ON yana.point_purchases;
CREATE POLICY point_purchases_owner_select ON yana.point_purchases FOR SELECT TO authenticated USING (user_id = uid());

-- ──────────────────────────────────────────────────────────────────
-- user_events : anniversaires + dates récurrentes
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yana.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  last_triggered_at timestamptz,
  next_trigger_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_events_type_check CHECK (event_type IN ('birthday','signup_anniversary')),
  CONSTRAINT user_events_unique UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS user_events_next_idx ON yana.user_events(next_trigger_at) WHERE next_trigger_at IS NOT NULL;

ALTER TABLE yana.user_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_events_owner_select ON yana.user_events;
CREATE POLICY user_events_owner_select ON yana.user_events FOR SELECT TO authenticated USING (user_id = uid());

-- ──────────────────────────────────────────────────────────────────
-- fn atomique redeem_shop_item (lock pessimiste purama_points)
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION yana.redeem_shop_item(
  p_user_id uuid,
  p_item_slug text
)
RETURNS TABLE (
  purchase_id uuid,
  new_balance bigint,
  coupon_code text,
  item_name text,
  item_type text,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = yana, public
AS $$
DECLARE
  v_item yana.point_shop_items%ROWTYPE;
  v_balance bigint;
  v_purchase_id uuid;
  v_coupon text;
  v_expires timestamptz;
BEGIN
  -- Fetch item
  SELECT * INTO v_item FROM yana.point_shop_items WHERE slug = p_item_slug AND active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 0::bigint, NULL::text, NULL::text, NULL::text, 'ITEM_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Lock user profile row (pessimiste)
  SELECT purama_points INTO v_balance FROM yana.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 0::bigint, NULL::text, NULL::text, NULL::text, 'USER_NOT_FOUND'::text;
    RETURN;
  END IF;

  IF v_balance < v_item.cost_points THEN
    RETURN QUERY SELECT NULL::uuid, v_balance, NULL::text, NULL::text, NULL::text, 'INSUFFICIENT_POINTS'::text;
    RETURN;
  END IF;

  -- Generate coupon code for discount_coupon / free_month types
  IF v_item.item_type IN ('discount_coupon','free_month','referral_boost') THEN
    v_coupon := upper(substring(md5(random()::text || gen_random_uuid()::text) FROM 1 FOR 10));
    v_expires := CASE
      WHEN v_item.duration_days IS NOT NULL THEN now() + (v_item.duration_days || ' days')::interval
      ELSE now() + interval '30 days'
    END;
  END IF;

  -- Insert purchase
  INSERT INTO yana.point_purchases (user_id, item_id, points_spent, coupon_code, expires_at)
  VALUES (p_user_id, v_item.id, v_item.cost_points, v_coupon, v_expires)
  RETURNING id INTO v_purchase_id;

  -- Decrement points
  UPDATE yana.profiles
  SET purama_points = purama_points - v_item.cost_points
  WHERE id = p_user_id
  RETURNING purama_points INTO v_balance;

  -- Log point_transaction
  INSERT INTO yana.point_transactions (user_id, amount, direction, reason, source, balance_after)
  VALUES (p_user_id, v_item.cost_points, 'debit', 'shop_purchase', v_item.slug, v_balance);

  RETURN QUERY SELECT v_purchase_id, v_balance, v_coupon, v_item.name, v_item.item_type, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION yana.redeem_shop_item(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yana.redeem_shop_item(uuid, text) TO service_role;

-- ──────────────────────────────────────────────────────────────────
-- fn atomique open_daily_gift (1 ouverture / 24h)
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION yana.open_daily_gift(p_user_id uuid)
RETURNS TABLE (
  gift_type text,
  gift_value integer,
  streak_count integer,
  new_points_balance bigint,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = yana, public
AS $$
DECLARE
  v_last_opened timestamptz;
  v_previous_streak integer;
  v_new_streak integer;
  v_type text;
  v_value integer;
  v_roll numeric;
  v_streak_interval interval;
  v_current_points bigint;
  v_new_balance bigint;
BEGIN
  -- Last open for this user
  SELECT opened_at, streak_count INTO v_last_opened, v_previous_streak
  FROM yana.daily_gifts
  WHERE user_id = p_user_id
  ORDER BY opened_at DESC
  LIMIT 1;

  -- Anti double-open : ≥ 20 h depuis le dernier (tolère légère dérive horaire, < 24h strict)
  IF v_last_opened IS NOT NULL AND (now() - v_last_opened) < interval '20 hours' THEN
    RETURN QUERY SELECT NULL::text, NULL::integer, NULL::integer, NULL::bigint, 'ALREADY_OPENED_TODAY'::text;
    RETURN;
  END IF;

  -- Streak calculation : si ouvert dans les 48h, on continue; sinon reset à 1
  v_streak_interval := now() - COALESCE(v_last_opened, now() - interval '7 days');
  IF v_streak_interval <= interval '48 hours' AND v_previous_streak IS NOT NULL THEN
    v_new_streak := v_previous_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Lock profile row
  SELECT purama_points INTO v_current_points FROM yana.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text, NULL::integer, NULL::integer, NULL::bigint, 'USER_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Reward distribution (CLAUDE.md §DAILY GIFT)
  -- 40% 5-20pts | 25% coupon -5% | 15% 1ticket | 10% 3credits | 5% -20% 3j | 3% 50-100pts | 2% -50% 24h
  v_roll := random();
  IF v_roll < 0.40 THEN
    v_type := 'points';
    v_value := 5 + floor(random() * 16)::integer; -- 5..20
  ELSIF v_roll < 0.65 THEN
    v_type := 'coupon_percent';
    v_value := 5; -- -5% pendant 7j
  ELSIF v_roll < 0.80 THEN
    v_type := 'ticket';
    v_value := 1;
  ELSIF v_roll < 0.90 THEN
    v_type := 'credits';
    v_value := 3;
  ELSIF v_roll < 0.95 THEN
    v_type := 'coupon_percent';
    v_value := 20; -- -20% 3j
  ELSIF v_roll < 0.98 THEN
    v_type := 'points';
    v_value := 50 + floor(random() * 51)::integer; -- 50..100
  ELSE
    v_type := 'coupon_percent';
    v_value := 50; -- -50% 24h
  END IF;

  -- Streak ≥ 7 : minimum -10% coupon garanti
  IF v_new_streak >= 7 AND v_type = 'points' AND v_value < 10 THEN
    v_type := 'coupon_percent';
    v_value := 10;
  END IF;

  -- Insert gift log
  INSERT INTO yana.daily_gifts (user_id, gift_type, gift_value, streak_count)
  VALUES (p_user_id, v_type, v_value, v_new_streak);

  -- Si points reward, créditer profile
  IF v_type = 'points' THEN
    UPDATE yana.profiles SET purama_points = purama_points + v_value WHERE id = p_user_id RETURNING purama_points INTO v_new_balance;
    INSERT INTO yana.point_transactions (user_id, amount, direction, reason, source, balance_after)
    VALUES (p_user_id, v_value, 'credit', 'daily_gift', 'daily', v_new_balance);
  ELSE
    v_new_balance := v_current_points;
  END IF;

  RETURN QUERY SELECT v_type, v_value, v_new_streak, v_new_balance, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION yana.open_daily_gift(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yana.open_daily_gift(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────
-- SEEDS point_shop_items (4 items — Tissma 2026-04-23)
-- ──────────────────────────────────────────────────────────────────
INSERT INTO yana.point_shop_items (slug, category, name, description, cost_points, item_type, discount_percent, duration_days, target_plan, sort_order) VALUES
  ('discount-10-1-month', 'discount', 'Réduction −10%', 'Coupon −10% sur ton prochain abonnement (1 mois).', 1000, 'discount_coupon', 10, 30, NULL, 10),
  ('referral-boost-24h', 'boost', 'Boost parrainage ×2 (24 h)', 'Tes commissions parrainage doublées pendant 24 h.', 2000, 'referral_boost', NULL, 1, NULL, 20),
  ('free-essentiel-month', 'subscription', '1 mois Essentiel offert', 'Un mois d''abonnement Essentiel entièrement gratuit.', 10000, 'free_month', NULL, 30, 'essentiel', 30)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO yana.point_shop_items (slug, category, name, description, cost_points, item_type, value_cents, sort_order) VALUES
  ('cash-5eur', 'cash', '5 € crédités sur le wallet', 'Conversion 50 000 pts → 5 € liquides dans ton portefeuille.', 50000, 'cash_credit', 500, 40)
ON CONFLICT (slug) DO NOTHING;

SELECT count(*) AS total_items, count(*) FILTER (WHERE active=true) AS active FROM yana.point_shop_items;
