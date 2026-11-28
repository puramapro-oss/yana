import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const exe = (name) => process.env.POSTGRES_BIN ? join(process.env.POSTGRES_BIN, name) : name
const missing = spawnSync(exe('initdb'), ['--version']).error?.code === 'ENOENT'
const migration = readFileSync(new URL('../db/migrations/20261128_trip_observation.sql', import.meta.url), 'utf8')
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
const table = (name) => schema.match(new RegExp('CREATE TABLE IF NOT EXISTS yana\\.' + name + ' \\([\\s\\S]*?\\n\\);'))[0]

test('PostgreSQL clôture le trajet et crédite les Graines une fois, même après rejeu', {
  skip: missing && 'PostgreSQL requis (initdb et postgres)',
}, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'yana-score-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const init = spawnSync(exe('initdb'), ['-D', dir, '--no-locale', '-E', 'UTF8', '-U', 'test_admin'], { encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const sql = `
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA yana;
    CREATE TABLE yana.profiles(id uuid PRIMARY KEY, xp integer DEFAULT 0, seeds_balance integer DEFAULT 0,
      total_trips integer DEFAULT 0, total_distance_km numeric DEFAULT 0);
    CREATE TABLE yana.vehicles(id uuid PRIMARY KEY);
    ${table('trips')}
    ${table('trip_events')}
    GRANT USAGE ON SCHEMA yana TO service_role, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA yana TO service_role, authenticated;
    ${migration}
    ${migration}
    SET ROLE service_role;
    DO $test$
    DECLARE
      u uuid := gen_random_uuid(); t uuid := gen_random_uuid(); t2 uuid := gen_random_uuid();
      r jsonb := '{"distance_km":2,"duration_sec":120,"score":{"co2_kg":0.3,"safety_score":90,"eco_score":60,"seeds_earned":2},"xp_gained":10}';
      neutral jsonb := '{"distance_km":0,"duration_sec":0,"score":{"co2_kg":0,"safety_score":null,"eco_score":null,"seeds_earned":0},"xp_gained":0}';
    BEGIN
      INSERT INTO yana.profiles(id) VALUES(u);
      INSERT INTO yana.trips(id,user_id,started_at) VALUES(t,u,now() - interval '2 minutes'), (t2,u,now());
      ASSERT NOT yana.record_trip_coverage(gen_random_uuid(),t,21,100,1000);
      ASSERT NOT yana.record_trip_coverage(u,t,21,500,1000);
      ASSERT yana.record_trip_coverage(u,t,21,100,1000);
      ASSERT NOT yana.record_trip_coverage(u,t,21,100,1000);
      ASSERT yana.finalize_observed_trip(u,t,r,NULL,NULL) = r;
      ASSERT yana.finalize_observed_trip(u,t,neutral,NULL,NULL) = r;
      ASSERT NOT yana.record_trip_coverage(u,t,21,100,1000);
      ASSERT NOT EXISTS(SELECT 1 FROM yana.trip_coverage_receipts WHERE trip_id=t);
      ASSERT yana.finalize_observed_trip(u,t2,neutral,NULL,NULL) = neutral;
      ASSERT (SELECT safety_score IS NULL AND eco_score IS NULL FROM yana.trips WHERE id=t2);
      ASSERT (SELECT seeds_balance=2 AND xp=10 AND total_trips=2 FROM yana.profiles WHERE id=u);
      ASSERT NOT has_function_privilege('authenticated','yana.finalize_observed_trip(uuid,uuid,jsonb,numeric,text)','EXECUTE');
      ASSERT NOT has_table_privilege('authenticated','yana.trip_finalizations','INSERT');
      ASSERT NOT has_table_privilege('authenticated','yana.trips','UPDATE');
    END;
    $test$;
    SELECT 'trip_score_checks_passed';
  `
  const result = spawnSync(exe('postgres'), ['--single', '-j', '-D', dir, '-c', 'exit_on_error=on',
    '-c', 'plpgsql.check_asserts=on', 'postgres'], {
    encoding: 'utf8', input: sql.split('\n').filter((line) => line.trim()).join('\n') + '\n\n',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /trip_score_checks_passed/)
})
