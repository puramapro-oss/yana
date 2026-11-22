-- Record manual planting intentions atomically; this does not buy or plant trees.
-- Apply with the normal migration owner after review. No historical backfill.
BEGIN;

-- Client edits follow the public profile PATCH allowlist. All other fields,
-- including future additions, belong to the server. Signup creates profiles.
-- This guard runs before profiles_touch_updated by trigger-name ordering;
-- updated_at stays protected while the existing server trigger maintains it.
CREATE OR REPLACE FUNCTION yana.guard_profile_tree_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_client_fields CONSTANT text[] := ARRAY[
    'full_name', 'theme', 'locale', 'birthdate',
    'notifications_enabled', 'tutorial_completed'
  ];
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Profiles are created by the server'
        USING ERRCODE = '42501';
    ELSIF (to_jsonb(NEW) - v_client_fields)
       IS DISTINCT FROM (to_jsonb(OLD) - v_client_fields) THEN
      RAISE EXCEPTION 'Protected profile fields are managed by the server'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION yana.guard_profile_tree_totals()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION yana.guard_profile_tree_totals() TO service_role;

DROP TRIGGER IF EXISTS profiles_guard_tree_totals ON yana.profiles;
CREATE TRIGGER profiles_guard_tree_totals
  BEFORE INSERT OR UPDATE ON yana.profiles
  FOR EACH ROW EXECUTE FUNCTION yana.guard_profile_tree_totals();

-- One RPC request = one transaction. Both callers must use this function;
-- keeping an old read/insert/update writer active would break the guarantee.
CREATE OR REPLACE FUNCTION yana.record_manual_tree_pledge(
  p_user_id uuid,
  p_trip_id uuid,
  p_ots_proof text
)
RETURNS TABLE (
  error_code text,
  tree jsonb,
  co2_offset_total_kg numeric,
  trees_planted_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = pg_catalog
AS $$
DECLARE
  v_co2 numeric;
  v_count integer;
  v_recorded_count bigint;
  v_invalid_ledger boolean;
  v_tree yana.trees_planted%ROWTYPE;
  -- Must match src/lib/co2.ts; the disposable database test verifies this.
  v_co2_per_tree CONSTANT numeric := 10;
BEGIN
  SELECT p.co2_offset_total_kg, p.trees_planted_total
    INTO v_co2, v_count
    FROM yana.profiles AS p
    WHERE p.id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    error_code := 'profile_not_found';
    RETURN NEXT;
    RETURN;
  END IF;

  co2_offset_total_kg := v_co2;
  trees_planted_total := v_count;
  IF v_co2 IS NULL OR v_co2::text IN ('NaN', 'Infinity', '-Infinity')
     OR v_co2 < 0 OR v_count IS NULL OR v_count < 0 THEN
    error_code := 'invalid_profile';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Fail closed on old partial writes; never rewrite historical evidence.
  SELECT COALESCE(sum(t.tree_count), 0),
         COALESCE(bool_or(t.tree_count IS NULL OR t.tree_count <= 0
           OR t.co2_offset_kg IS NULL OR t.co2_offset_kg < 0
           OR t.co2_offset_kg::text IN ('NaN', 'Infinity', '-Infinity')), false)
    INTO v_recorded_count, v_invalid_ledger
    FROM yana.trees_planted AS t
    WHERE t.user_id = p_user_id;
  IF v_invalid_ledger OR v_recorded_count <> v_count THEN
    error_code := 'reconciliation_required';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Recalculate after acquiring the lock, never from the caller's snapshot.
  IF v_count >= floor(v_co2 / v_co2_per_tree) THEN
    error_code := 'not_eligible';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_trip_id IS NOT NULL THEN
    PERFORM 1 FROM yana.trips AS t
      WHERE t.id = p_trip_id AND t.user_id = p_user_id
      FOR SHARE;
    IF NOT FOUND THEN
      error_code := 'invalid_trip';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO yana.trees_planted (
    user_id, trip_id, provider, tree_count, co2_offset_kg,
    cost_cents, certificate_url, ots_proof
  ) VALUES (
    p_user_id, p_trip_id, 'manual', 1, v_co2_per_tree,
    0, NULL, p_ots_proof
  ) RETURNING * INTO v_tree;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tree intention was not recorded';
  END IF;

  UPDATE yana.profiles AS p
    SET trees_planted_total = p.trees_planted_total + 1
    WHERE p.id = p_user_id
    RETURNING p.trees_planted_total INTO trees_planted_total;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tree counter was not updated';
  END IF;

  tree := to_jsonb(v_tree);
  RETURN NEXT;
END;
$$;

-- schema.sql grants function privileges to anon/authenticated by default.
-- Remove their explicit grants as well as PUBLIC; revoking PUBLIC alone is
-- insufficient. The migration owner keeps its inherent ownership privileges.
REVOKE ALL ON FUNCTION yana.record_manual_tree_pledge(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION yana.record_manual_tree_pledge(uuid, uuid, text)
  TO service_role;

COMMENT ON FUNCTION yana.record_manual_tree_pledge(uuid, uuid, text) IS
  'Atomically records one manual intention and consumes one earned threshold. No external planting provider is called.';

NOTIFY pgrst, 'reload schema';
COMMIT;
