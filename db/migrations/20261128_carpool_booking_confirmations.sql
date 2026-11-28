-- Reservation and completion share the carpool lock, then lock the booking.
-- Apply before the corresponding API release. Existing payouts are historical.
BEGIN;
ALTER TABLE yana.carpool_bookings
  ADD COLUMN IF NOT EXISTS driver_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS passenger_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_seeds_awarded integer,
  ADD COLUMN IF NOT EXISTS passenger_seeds_awarded integer;

-- The web and mobile clients read directly. Mutations go through authenticated
-- API handlers so simultaneous requests share the same transaction boundaries.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON yana.carpool_bookings, yana.carpools
  FROM PUBLIC, anon, authenticated;

-- Search and the participant detail handler return projections. Direct reads
-- of a ride with a private rendezvous are reserved to its driver.
DROP POLICY IF EXISTS carpool_private_meeting_select ON yana.carpools;
CREATE POLICY carpool_private_meeting_select ON yana.carpools AS RESTRICTIVE FOR SELECT TO authenticated
  USING (driver_id=auth.uid() OR (meeting_point_label IS NULL AND meeting_point_geohash IS NULL));

CREATE OR REPLACE FUNCTION yana.reserve_carpool_seats(
  p_carpool uuid, p_actor uuid, p_seats integer, p_contacts jsonb
) RETURNS jsonb LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  ride yana.carpools%ROWTYPE;
  booking yana.carpool_bookings%ROWTYPE;
  passenger yana.profiles%ROWTYPE;
BEGIN
  SELECT * INTO ride FROM yana.carpools WHERE id=p_carpool FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ride_missing'; END IF;
  SELECT * INTO passenger FROM yana.profiles WHERE id=p_actor;
  IF NOT FOUND OR (passenger.role IS DISTINCT FROM 'super_admin'
    AND passenger.onfido_status IS DISTINCT FROM 'approved') THEN RAISE EXCEPTION 'identity_required'; END IF;
  IF ride.driver_id=p_actor THEN RAISE EXCEPTION 'own_ride'; END IF;
  IF ride.women_only AND passenger.metadata->>'gender' IS DISTINCT FROM 'female' THEN RAISE EXCEPTION 'restricted_ride'; END IF;
  IF p_seats IS NULL OR p_seats NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'invalid_seats'; END IF;
  SELECT * INTO booking FROM yana.carpool_bookings WHERE carpool_id=p_carpool AND passenger_id=p_actor FOR UPDATE;
  IF FOUND THEN
    IF booking.status IN ('confirmed','in_progress') AND booking.seats=p_seats AND booking.safe_walk_contacts=p_contacts THEN
      RETURN jsonb_build_object('booking',to_jsonb(booking),'replayed',true);
    END IF;
    RAISE EXCEPTION 'already_booked';
  END IF;
  IF ride.status<>'open' OR ride.departure_at<=now() OR ride.seats_remaining<p_seats THEN RAISE EXCEPTION 'ride_unavailable'; END IF;
  INSERT INTO yana.carpool_bookings (carpool_id,passenger_id,seats,total_price_cents,total_prime_cents,status,safe_walk_contacts)
    VALUES (ride.id,p_actor,p_seats,p_seats*ride.price_per_seat_cents,0,'confirmed',p_contacts) RETURNING * INTO booking;
  UPDATE yana.carpools SET seats_remaining=seats_remaining-p_seats,
    status=CASE WHEN seats_remaining=p_seats THEN 'full' ELSE status END WHERE id=ride.id;
  RETURN jsonb_build_object('booking',to_jsonb(booking),'replayed',false);
END $$;

CREATE OR REPLACE FUNCTION yana.confirm_carpool_arrival(p_booking uuid,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  ride yana.carpools%ROWTYPE;
  booking yana.carpool_bookings%ROWTYPE;
  driver_seeds integer;
  passenger_seeds integer;
  funding text;
BEGIN
  SELECT c.* INTO ride FROM yana.carpools c JOIN yana.carpool_bookings b ON b.carpool_id=c.id
    WHERE b.id=p_booking FOR UPDATE OF c;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_missing'; END IF;
  SELECT * INTO STRICT booking FROM yana.carpool_bookings WHERE id=p_booking FOR UPDATE;
  IF p_actor IS NULL OR p_actor NOT IN (booking.passenger_id,ride.driver_id) THEN RAISE EXCEPTION 'party_required'; END IF;
  funding := CASE WHEN booking.total_price_cents=0 THEN 'free' ELSE 'awaiting_funding' END;
  IF booking.status='completed' THEN
    RETURN jsonb_build_object('ok',true,'status','completed','settlement',
      CASE WHEN booking.driver_seeds_awarded IS NULL THEN 'historical' ELSE funding END,
      'my_seeds', CASE WHEN p_actor=ride.driver_id THEN booking.driver_seeds_awarded ELSE booking.passenger_seeds_awarded END);
  END IF;
  IF ride.status NOT IN ('open','full','in_progress') OR booking.status NOT IN ('confirmed','in_progress')
    OR booking.passenger_id=ride.driver_id THEN RAISE EXCEPTION 'invalid_state'; END IF;
  IF ride.departure_at>=clock_timestamp() THEN RAISE EXCEPTION 'not_departed'; END IF;

  UPDATE yana.carpool_bookings SET
    driver_confirmed_at=CASE WHEN p_actor=ride.driver_id THEN coalesce(driver_confirmed_at,now()) ELSE driver_confirmed_at END,
    passenger_confirmed_at=CASE WHEN p_actor=booking.passenger_id THEN coalesce(passenger_confirmed_at,now()) ELSE passenger_confirmed_at END
    WHERE id=p_booking RETURNING * INTO booking;
  IF booking.driver_confirmed_at IS NULL OR booking.passenger_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('ok',true,'status','awaiting_other','settlement',funding,'my_seeds',null);
  END IF;
  -- Community Graines only. Booking in this application does not capture funds.
  -- Lock profiles in a consistent order for people sharing different rides.
  PERFORM id FROM yana.profiles WHERE id IN (ride.driver_id,booking.passenger_id) ORDER BY id FOR UPDATE;
  UPDATE yana.profiles SET seeds_balance=seeds_balance+50*
    CASE WHEN role='super_admin' OR plan='legende' THEN 10 WHEN plan='infini' THEN 5 ELSE 1 END
    WHERE id=ride.driver_id RETURNING 50*
    CASE WHEN role='super_admin' OR plan='legende' THEN 10 WHEN plan='infini' THEN 5 ELSE 1 END INTO STRICT driver_seeds;
  UPDATE yana.profiles SET seeds_balance=seeds_balance+50*
    CASE WHEN role='super_admin' OR plan='legende' THEN 10 WHEN plan='infini' THEN 5 ELSE 1 END
    WHERE id=booking.passenger_id RETURNING 50*
    CASE WHEN role='super_admin' OR plan='legende' THEN 10 WHEN plan='infini' THEN 5 ELSE 1 END INTO STRICT passenger_seeds;
  UPDATE yana.carpool_bookings SET status='completed',completed_at=now(),
    driver_seeds_awarded=driver_seeds,passenger_seeds_awarded=passenger_seeds WHERE id=p_booking;
  IF NOT EXISTS (SELECT FROM yana.carpool_bookings WHERE carpool_id=ride.id AND status IN ('pending','confirmed','in_progress','disputed')) THEN
    UPDATE yana.carpools SET status='completed' WHERE id=ride.id;
  END IF;
  RETURN jsonb_build_object('ok',true,'status','completed','settlement',funding,
    'my_seeds',CASE WHEN p_actor=ride.driver_id THEN driver_seeds ELSE passenger_seeds END);
END $$;

REVOKE ALL ON FUNCTION yana.reserve_carpool_seats(uuid,uuid,integer,jsonb),
  yana.confirm_carpool_arrival(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION yana.reserve_carpool_seats(uuid,uuid,integer,jsonb),
  yana.confirm_carpool_arrival(uuid,uuid) TO service_role;
COMMIT;
