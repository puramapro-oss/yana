-- =============================================================================
-- 0004_emails.sql — Infra emails Resend YANA
-- =============================================================================
-- Tables :
--   yana.email_templates      — bibliothèque éditable (10 types + events)
--   yana.email_sequences      — log d'envoi (idempotence par user+type)
--   yana.email_unsubscribes   — kill switch RGPD (remplace ALTER profiles,
--                                profiles owned by supabase_admin)
-- RLS : user voit ses propres sequences + ses propres unsubscribes.
--       Templates = service role uniquement.
-- =============================================================================

-- 1. email_templates ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS yana.email_templates (
  type              TEXT PRIMARY KEY,
  category          TEXT NOT NULL CHECK (category IN ('daily', 'event')),
  day_offset        INT,                          -- 0,1,3,7,14,21,30 pour daily ; NULL pour event
  subject           TEXT NOT NULL,
  heading           TEXT NOT NULL,
  body              TEXT NOT NULL,                -- supporte vars {{first_name}} etc.
  cta_label         TEXT NOT NULL,
  cta_url_template  TEXT NOT NULL,                -- ex: "/dashboard" ou "/pricing?code={{code}}"
  footer_note       TEXT,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON yana.email_templates(category)
  WHERE active = true;

-- 2. email_sequences ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS yana.email_sequences (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  template_type      TEXT NOT NULL REFERENCES yana.email_templates(type) ON DELETE RESTRICT,
  context_ref        TEXT,                                -- id parrainage/concours/palier si event
  resend_id          TEXT,                                -- ID retourné par Resend
  subject_snapshot   TEXT NOT NULL,                       -- sujet au moment de l'envoi
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at          TIMESTAMPTZ,
  clicked_at         TIMESTAMPTZ,
  unsubscribe_token  TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  error              TEXT                                 -- non-null si envoi échoué (monitoring)
);

-- Idempotence : un type 'daily' ne doit être envoyé qu'une fois par user (succès).
-- Events peuvent revenir plusieurs fois avec context_ref différent (ex: palier 1, 2, 3).
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sequences_daily_once
  ON yana.email_sequences(user_id, template_type)
  WHERE context_ref IS NULL AND error IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sequences_event_unique
  ON yana.email_sequences(user_id, template_type, context_ref)
  WHERE context_ref IS NOT NULL AND error IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_sequences_user ON yana.email_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_sent ON yana.email_sequences(sent_at);

-- 3. email_unsubscribes (remplace boolean sur profiles) ----------------------
-- Row présente = user désinscrit du marketing. Absent = opt-in par défaut.
CREATE TABLE IF NOT EXISTS yana.email_unsubscribes (
  user_id         UUID PRIMARY KEY REFERENCES yana.profiles(id) ON DELETE CASCADE,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source          TEXT NOT NULL DEFAULT 'link' CHECK (source IN ('link', 'settings', 'admin'))
);

-- 4. RLS ----------------------------------------------------------------------
ALTER TABLE yana.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Templates : service role only (gestion admin + CRON). Pas de policy → deny.

-- Sequences : user voit ses envois (transparence RGPD)
DROP POLICY IF EXISTS "sequences_owner_select" ON yana.email_sequences;
CREATE POLICY "sequences_owner_select" ON yana.email_sequences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Unsubscribes : user voit et gère son propre statut
DROP POLICY IF EXISTS "unsubscribes_owner_all" ON yana.email_unsubscribes;
CREATE POLICY "unsubscribes_owner_all" ON yana.email_unsubscribes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Trigger updated_at (scoped à email_templates, fonction dédiée) ----------
CREATE OR REPLACE FUNCTION yana.email_templates_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_templates_touch ON yana.email_templates;
CREATE TRIGGER trg_email_templates_touch
  BEFORE UPDATE ON yana.email_templates
  FOR EACH ROW EXECUTE FUNCTION yana.email_templates_touch_updated_at();

-- 6. GRANTs (obligatoire — tables créées par postgres sans privilèges implicites)
GRANT USAGE ON SCHEMA yana TO service_role, authenticated, anon;
GRANT ALL       ON yana.email_templates    TO service_role;
GRANT ALL       ON yana.email_sequences    TO service_role;
GRANT ALL       ON yana.email_unsubscribes TO service_role;
GRANT SELECT    ON yana.email_sequences    TO authenticated;
GRANT SELECT, INSERT, DELETE ON yana.email_unsubscribes TO authenticated;
