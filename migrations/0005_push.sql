-- =============================================================================
-- 0005_push.sql — Notifs push engagement-score YANA
-- =============================================================================
-- Tables :
--   yana.web_push_subscriptions      — side table (push_tokens owned by
--                                       supabase_admin, ne peut être ALTER).
--                                       P7 mobile Expo réutilisera push_tokens.
--   yana.user_notification_profile   — score engagement + style + horaire
--   yana.notification_preferences    — 6 types × days/hour/frequency/pause
--   yana.push_log                    — historique envois + opened tracking
-- =============================================================================

-- 1. web_push_subscriptions (côté web, standard W3C Push API / VAPID) --------
-- user a 1..N devices (desktop + mobile browser), dédupliqué par endpoint
CREATE TABLE IF NOT EXISTS yana.web_push_subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  endpoint       TEXT NOT NULL,
  p256dh         TEXT NOT NULL,
  auth           TEXT NOT NULL,
  user_agent     TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  failure_count  INT NOT NULL DEFAULT 0,
  last_active    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_wps_user_enabled
  ON yana.web_push_subscriptions(user_id)
  WHERE enabled = true;

-- 2. user_notification_profile -----------------------------------------------
CREATE TABLE IF NOT EXISTS yana.user_notification_profile (
  user_id             UUID PRIMARY KEY REFERENCES yana.profiles(id) ON DELETE CASCADE,
  engagement_score    INT NOT NULL DEFAULT 50 CHECK (engagement_score BETWEEN 0 AND 100),
  notification_style  TEXT NOT NULL DEFAULT 'informative'
                        CHECK (notification_style IN ('encouraging', 'informative', 'warm')),
  preferred_hour      INT NOT NULL DEFAULT 10 CHECK (preferred_hour BETWEEN 0 AND 23),
  preferred_days      INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],  -- 0=dim, 6=sam
  avg_open_rate       NUMERIC(5,4) NOT NULL DEFAULT 0,
  last_active         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unp_last_active ON yana.user_notification_profile(last_active DESC);

-- 3. notification_preferences (1 row par type par user) ----------------------
CREATE TABLE IF NOT EXISTS yana.notification_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN (
                   'daily','achievement','referral','wallet','contest','lottery'
                 )),
  enabled        BOOLEAN NOT NULL DEFAULT true,
  days_of_week   INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  hour_start     INT NOT NULL DEFAULT 9  CHECK (hour_start BETWEEN 0 AND 23),
  hour_end       INT NOT NULL DEFAULT 20 CHECK (hour_end   BETWEEN 0 AND 23),
  frequency      TEXT NOT NULL DEFAULT 'normal' CHECK (frequency IN ('low','normal','high')),
  paused_until   TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_np_user ON yana.notification_preferences(user_id);

-- 4. push_log ---------------------------------------------------------------
-- sent_day = colonne DATE dédiée à l'idempotence (date_trunc sur TIMESTAMPTZ
-- n'est pas IMMUTABLE donc inutilisable dans un index). DEFAULT CURRENT_DATE
-- (UTC côté serveur Postgres).
CREATE TABLE IF NOT EXISTS yana.push_log (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  type                      TEXT NOT NULL,
  title                     TEXT NOT NULL,
  body                      TEXT NOT NULL,
  url                       TEXT,
  sent_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_day                  DATE        NOT NULL DEFAULT CURRENT_DATE,
  opened_at                 TIMESTAMPTZ,
  failed                    BOOLEAN NOT NULL DEFAULT false,
  error                     TEXT,
  engagement_score_at_send  INT,
  endpoint_hash             TEXT,
  token_invalidated         BOOLEAN NOT NULL DEFAULT false
);

-- Anti-double-send daily : 1 push par user × type × jour UTC (catégorie daily uniquement).
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_log_daily_once
  ON yana.push_log(user_id, type, sent_day)
  WHERE type = 'daily' AND failed = false;

CREATE INDEX IF NOT EXISTS idx_push_log_user_sent ON yana.push_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_log_opened    ON yana.push_log(opened_at) WHERE opened_at IS NOT NULL;

-- 5. RLS --------------------------------------------------------------------
ALTER TABLE yana.web_push_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.user_notification_profile   ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.notification_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.push_log                    ENABLE ROW LEVEL SECURITY;

-- web_push_subscriptions : user gère ses propres abonnements
DROP POLICY IF EXISTS "wps_owner_all" ON yana.web_push_subscriptions;
CREATE POLICY "wps_owner_all" ON yana.web_push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_notification_profile : user gère son profil
DROP POLICY IF EXISTS "unp_owner_all" ON yana.user_notification_profile;
CREATE POLICY "unp_owner_all" ON yana.user_notification_profile
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- notification_preferences : user gère ses prefs
DROP POLICY IF EXISTS "np_owner_all" ON yana.notification_preferences;
CREATE POLICY "np_owner_all" ON yana.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- push_log : user voit ses envois (transparence RGPD)
DROP POLICY IF EXISTS "push_log_owner_select" ON yana.push_log;
CREATE POLICY "push_log_owner_select" ON yana.push_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Triggers updated_at ----------------------------------------------------
CREATE OR REPLACE FUNCTION yana.push_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unp_touch ON yana.user_notification_profile;
CREATE TRIGGER trg_unp_touch
  BEFORE UPDATE ON yana.user_notification_profile
  FOR EACH ROW EXECUTE FUNCTION yana.push_touch_updated_at();

DROP TRIGGER IF EXISTS trg_np_touch ON yana.notification_preferences;
CREATE TRIGGER trg_np_touch
  BEFORE UPDATE ON yana.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION yana.push_touch_updated_at();

-- 7. GRANTs -----------------------------------------------------------------
GRANT USAGE ON SCHEMA yana TO service_role, authenticated, anon;
GRANT ALL ON yana.web_push_subscriptions     TO service_role;
GRANT ALL ON yana.user_notification_profile  TO service_role;
GRANT ALL ON yana.notification_preferences   TO service_role;
GRANT ALL ON yana.push_log                   TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON yana.web_push_subscriptions     TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON yana.user_notification_profile  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON yana.notification_preferences   TO authenticated;
GRANT SELECT                         ON yana.push_log                   TO authenticated;
