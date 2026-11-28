import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

// POSTGRES_BIN may point to a standalone PostgreSQL installation's bin directory.
const pg = (name) => process.env.POSTGRES_BIN ? join(process.env.POSTGRES_BIN, name) : name
const missing = spawnSync(pg('initdb'), ['--version']).error?.code === 'ENOENT'
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../db/migrations/20261128_carpool_booking_confirmations.sql', import.meta.url), 'utf8')

test('réservation, double confirmation, attribution unique et absence de crédit non financé', {
  skip: missing && 'PostgreSQL requis (initdb et postgres)',
}, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'yana-arrival-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const init = spawnSync(pg('initdb'), ['-D', dir, '--no-locale', '-E', 'UTF8', '-U', 'test_admin'], { encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const ride = schema.match(/CREATE TABLE IF NOT EXISTS yana\.carpools \([\s\S]*?\n\);/)[0]
  const bookings = schema.match(/CREATE TABLE IF NOT EXISTS yana\.carpool_bookings \([\s\S]*?\n\);/)[0]
  const checks = `
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA yana; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT current_setting(''test.actor'', true)::uuid';
    CREATE TABLE yana.profiles (id uuid PRIMARY KEY, role text DEFAULT 'user', onfido_status text DEFAULT 'approved',
        metadata jsonb DEFAULT '{}', plan text DEFAULT 'free', seeds_balance bigint DEFAULT 0, wallet_balance_cents bigint DEFAULT 0);
    CREATE TABLE yana.vehicles (id uuid PRIMARY KEY);
    ${ride}
    ${bookings}
    ${migration}
    DO $test$
    DECLARE
      r uuid := gen_random_uuid(); d uuid := gen_random_uuid(); p uuid := gen_random_uuid();
      other uuid := gen_random_uuid(); b uuid; reply jsonb;
    BEGIN
      ASSERT NOT has_function_privilege('authenticated','yana.confirm_carpool_arrival(uuid,uuid)','EXECUTE');
      ASSERT has_function_privilege('service_role','yana.reserve_carpool_seats(uuid,uuid,integer,jsonb)','EXECUTE');
      INSERT INTO yana.profiles(id,plan) VALUES(d,'infini'),(p,'free'),(other,'free');
      INSERT INTO yana.carpools(id,driver_id,from_city,to_city,from_geohash,to_geohash,departure_at,seats_total,seats_remaining,price_per_seat_cents)
        VALUES(r,d,'Frasne','Bouverans','a','b',now()+interval '2 hours',1,1,1000);
      reply := yana.reserve_carpool_seats(r,p,1,'[]');
      b := (reply#>>'{booking,id}')::uuid;
      ASSERT NOT (reply->>'replayed')::boolean AND reply#>>'{booking,total_price_cents}'='1000';
      ASSERT (yana.reserve_carpool_seats(r,p,1,'[]')->>'replayed')::boolean;
      ASSERT (SELECT seats_remaining=0 AND status='full' FROM yana.carpools WHERE id=r);
      BEGIN PERFORM yana.reserve_carpool_seats(r,other,1,'[]'); RAISE EXCEPTION 'unexpected seat';
      EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='ride_unavailable'; END;
      BEGIN PERFORM yana.confirm_carpool_arrival(b,p); RAISE EXCEPTION 'premature success';
      EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='not_departed'; END;
      UPDATE yana.carpools SET departure_at=now()-interval '1 hour' WHERE id=r;
      ASSERT yana.confirm_carpool_arrival(b,p)->>'status'='awaiting_other';
      ASSERT yana.confirm_carpool_arrival(b,p)->>'status'='awaiting_other';
      ASSERT (SELECT seeds_balance=0 FROM yana.profiles WHERE id=p);
      reply := yana.confirm_carpool_arrival(b,d);
      ASSERT reply->>'status'='completed' AND reply->>'settlement'='awaiting_funding' AND (reply->>'my_seeds')::int=250;
      ASSERT (yana.confirm_carpool_arrival(b,p)->>'my_seeds')::int=50;
      ASSERT (SELECT sum(seeds_balance)=300 AND sum(wallet_balance_cents)=0 FROM yana.profiles);
      ASSERT (SELECT payout_driver_cents=0 AND payout_eco_pool_cents=0 AND payout_platform_cents=0 FROM yana.carpool_bookings WHERE id=b);
      ASSERT (SELECT status='completed' FROM yana.carpools WHERE id=r);
    END;
    $test$;
    SELECT 'booking_checks_passed';
  `
  // Standalone mode needs no listening socket. A single input batch preserves function bodies.
  const sql = checks.split('\n').filter((line) => line.trim()).join('\n') + '\n\n'
  const result = spawnSync(pg('postgres'), ['--single', '-j', '-D', dir, '-c', 'exit_on_error=off', '-c', 'plpgsql.check_asserts=on', 'postgres'], {
    encoding: 'utf8', input: sql,
  })
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(result.stderr, /ERROR:|FATAL:/)
  assert.match(result.stdout, /= "booking_checks_passed"/)
})
