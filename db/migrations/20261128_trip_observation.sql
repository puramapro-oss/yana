-- Trip and event writes already use the authenticated server routes. Keep owner reads.
REVOKE INSERT, UPDATE, DELETE ON yana.trips, yana.trip_events FROM PUBLIC, anon, authenticated;

-- Receipts contain cumulative counters, never a location, route or speed limit.
CREATE TABLE IF NOT EXISTS yana.trip_coverage_receipts (
  trip_id uuid NOT NULL REFERENCES yana.trips(id) ON DELETE CASCADE,
  minute_bucket bigint NOT NULL,
  received_at timestamptz NOT NULL,
  accepted_fixes integer NOT NULL,
  observed_seconds integer NOT NULL,
  distance_m integer NOT NULL,
  PRIMARY KEY (trip_id, minute_bucket)
);
CREATE TABLE IF NOT EXISTS yana.trip_finalizations (
  trip_id uuid PRIMARY KEY REFERENCES yana.trips(id) ON DELETE CASCADE,
  result jsonb NOT NULL
);
ALTER TABLE yana.trip_coverage_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana.trip_finalizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON yana.trip_coverage_receipts, yana.trip_finalizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON yana.trip_coverage_receipts, yana.trip_finalizations TO service_role;

CREATE OR REPLACE FUNCTION yana.record_trip_coverage(
  p_user_id uuid, p_trip_id uuid, p_fixes integer, p_observed integer, p_distance_m integer
) RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_started timestamptz;
  v_received timestamptz := clock_timestamp();
BEGIN
  SELECT started_at INTO v_started FROM yana.trips
    WHERE id = p_trip_id AND user_id = p_user_id AND status = 'in_progress' FOR SHARE;
  IF NOT FOUND OR p_observed < 1 OR p_fixes < 2 OR p_distance_m < 0
    OR p_observed > 86400 OR p_observed > (p_fixes::bigint - 1) * 15
    OR p_observed > extract(epoch FROM v_received - v_started) + 5
    OR EXISTS (SELECT 1 FROM yana.trip_finalizations WHERE trip_id = p_trip_id) THEN
    RETURN false;
  END IF;
  INSERT INTO yana.trip_coverage_receipts
    (trip_id, minute_bucket, received_at, accepted_fixes, observed_seconds, distance_m)
  VALUES (p_trip_id, floor(extract(epoch FROM v_received) / 60)::bigint,
    v_received, p_fixes, p_observed, p_distance_m)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION yana.purge_closed_trip_coverage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM yana.trip_coverage_receipts WHERE trip_id = NEW.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS purge_closed_trip_coverage ON yana.trips;
CREATE TRIGGER purge_closed_trip_coverage AFTER UPDATE OF status ON yana.trips
  FOR EACH ROW WHEN (OLD.status = 'in_progress' AND NEW.status <> 'in_progress')
  EXECUTE FUNCTION yana.purge_closed_trip_coverage();

CREATE OR REPLACE FUNCTION yana.finalize_observed_trip(
  p_user_id uuid, p_trip_id uuid, p_result jsonb, p_max_speed numeric, p_end_geohash text
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_status text;
  v_previous jsonb;
  v_distance numeric := (p_result->>'distance_km')::numeric;
  v_duration integer := (p_result->>'duration_sec')::integer;
  v_seeds integer := (p_result->'score'->>'seeds_earned')::integer;
  v_xp integer := (p_result->>'xp_gained')::integer;
BEGIN
  SELECT status INTO v_status FROM yana.trips
    WHERE id = p_trip_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT result INTO v_previous FROM yana.trip_finalizations WHERE trip_id = p_trip_id;
  IF FOUND THEN RETURN v_previous; END IF;
  IF v_status <> 'in_progress' THEN RETURN NULL; END IF;

  UPDATE yana.trips SET
    status = 'completed', ended_at = clock_timestamp(), distance_km = v_distance,
    duration_sec = v_duration, max_speed_kmh = p_max_speed,
    avg_speed_kmh = CASE WHEN v_distance > 0 AND v_duration > 0 AND v_distance * 1000 <= v_duration * 90
      THEN v_distance * 3600 / v_duration END,
    safety_score = (p_result->'score'->>'safety_score')::integer,
    eco_score = (p_result->'score'->>'eco_score')::integer,
    co2_kg = (p_result->'score'->>'co2_kg')::numeric,
    seeds_earned = v_seeds, points_earned = v_xp, end_geohash = p_end_geohash
    WHERE id = p_trip_id;
  UPDATE yana.profiles SET
    seeds_balance = seeds_balance + v_seeds, xp = xp + v_xp,
    total_trips = total_trips + 1, total_distance_km = total_distance_km + v_distance
    WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing trip profile'; END IF;
  INSERT INTO yana.trip_finalizations (trip_id, result) VALUES (p_trip_id, p_result);
  RETURN p_result;
END;
$$;
REVOKE ALL ON FUNCTION yana.record_trip_coverage(uuid, uuid, integer, integer, integer),
  yana.finalize_observed_trip(uuid, uuid, jsonb, numeric, text),
  yana.purge_closed_trip_coverage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION yana.record_trip_coverage(uuid, uuid, integer, integer, integer),
  yana.finalize_observed_trip(uuid, uuid, jsonb, numeric, text) TO service_role;
