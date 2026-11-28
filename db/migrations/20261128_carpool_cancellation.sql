BEGIN;

CREATE OR REPLACE FUNCTION yana.cancel_carpool_participation(
  p_carpool_id uuid, p_user_id uuid, p_target text
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  ride yana.carpools%ROWTYPE;
  booking yana.carpool_bookings%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_target IS NULL OR p_target NOT IN ('trip', 'booking') THEN
    RETURN 'not_found';
  END IF;

  SELECT * INTO ride FROM yana.carpools WHERE id = p_carpool_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF p_target = 'trip' THEN
    IF ride.driver_id <> p_user_id THEN RETURN 'not_found'; END IF;
    IF ride.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  ELSE
    SELECT * INTO booking FROM yana.carpool_bookings
      WHERE carpool_id = ride.id AND passenger_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF booking.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
    IF booking.status NOT IN ('pending', 'confirmed') THEN RETURN 'unavailable'; END IF;
  END IF;

  IF ride.status NOT IN ('open', 'full') OR ride.departure_at <= clock_timestamp() THEN
    RETURN 'unavailable';
  END IF;

  IF p_target = 'trip' THEN
    IF EXISTS (
      SELECT 1 FROM yana.carpool_bookings WHERE carpool_id = ride.id
      AND status IN ('in_progress', 'completed', 'disputed')
    ) THEN RETURN 'unavailable'; END IF;

    UPDATE yana.carpool_bookings SET status = 'cancelled'
      WHERE carpool_id = ride.id AND status IN ('pending', 'confirmed');
    UPDATE yana.carpools SET status = 'cancelled', seats_remaining = 0 WHERE id = ride.id;
  ELSE
    IF ride.seats_remaining < 0 OR booking.seats <= 0
      OR ride.seats_remaining + booking.seats > ride.seats_total THEN
      RETURN 'unavailable';
    END IF;
    UPDATE yana.carpool_bookings SET status = 'cancelled' WHERE id = booking.id;
    UPDATE yana.carpools SET status = 'open', seats_remaining = seats_remaining + booking.seats
      WHERE id = ride.id;
  END IF;
  RETURN 'cancelled';
END;
$$;

REVOKE ALL ON FUNCTION yana.cancel_carpool_participation(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION yana.cancel_carpool_participation(uuid, uuid, text) TO service_role;
COMMIT;
