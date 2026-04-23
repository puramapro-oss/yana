-- ============================================================================
-- STORY SHARES — partages story 1080×1920 sur réseaux sociaux
-- ============================================================================
SET search_path = yana, public;

CREATE TABLE IF NOT EXISTS yana.story_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES yana.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('streak', 'palier', 'mission', 'gains', 'classement', 'achievement', 'scan')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  shared_to TEXT,
  points_given INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS story_shares_user_id_idx ON yana.story_shares(user_id);
CREATE INDEX IF NOT EXISTS story_shares_created_at_idx ON yana.story_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS story_shares_user_created_idx ON yana.story_shares(user_id, created_at DESC);

ALTER TABLE yana.story_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='yana' AND tablename='story_shares' AND policyname='story_shares_user_own') THEN
    CREATE POLICY story_shares_user_own ON yana.story_shares FOR ALL
      USING (user_id IN (SELECT id FROM yana.profiles WHERE auth_user_id = auth.uid()))
      WITH CHECK (user_id IN (SELECT id FROM yana.profiles WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

GRANT SELECT, INSERT ON yana.story_shares TO authenticated;
GRANT ALL ON yana.story_shares TO service_role;
