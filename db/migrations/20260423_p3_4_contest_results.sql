-- P3.4 /contest — table snapshot des classements hebdo
-- Rempli par CRON en P4 (dim 23h59). En P3.4 on crée juste le réceptacle.

CREATE TABLE IF NOT EXISTS yana.contest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_pool_cents integer NOT NULL DEFAULT 0,
  winners jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contest_results_period_type_check CHECK (period_type IN ('weekly', 'monthly', 'seasonal')),
  CONSTRAINT contest_results_period_order CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS contest_results_period_idx
  ON yana.contest_results(period_type, period_end DESC);

-- Public read (historique visible par tous, privacy respectée via jsonb winners
-- qui contient seulement : { user_id, display_name, rank, amount_cents, score })
ALTER TABLE yana.contest_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contest_results_public_select ON yana.contest_results;
CREATE POLICY contest_results_public_select
  ON yana.contest_results
  FOR SELECT
  TO anon, authenticated
  USING (true);
