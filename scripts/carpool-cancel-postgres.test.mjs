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
const migration = readFileSync(new URL('../db/migrations/20261128_carpool_cancellation.sql', import.meta.url), 'utf8')

test('annulations réservées aux participants, atomiques, avant départ, sans double restitution', {
  skip: missing && 'PostgreSQL requis (initdb et postgres)',
}, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'yana-cancel-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const init = spawnSync(pg('initdb'), ['-D', dir, '--no-locale', '-E', 'UTF8', '-U', 'test_admin'], { encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const ride = schema.match(/CREATE TABLE IF NOT EXISTS yana\.carpools \([\s\S]*?\n\);/)[0]
  const bookings = schema.match(/CREATE TABLE IF NOT EXISTS yana\.carpool_bookings \([\s\S]*?\n\);/)[0]
  const checks = `
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA yana;
    CREATE TABLE yana.profiles (id uuid PRIMARY KEY);
    CREATE TABLE yana.vehicles (id uuid PRIMARY KEY);
    ${ride}
    ${bookings}
    ${migration}
    DO $test$
    DECLARE
      r uuid := gen_random_uuid(); d uuid := gen_random_uuid();
      p uuid := gen_random_uuid(); p2 uuid := gen_random_uuid();
      other uuid := gen_random_uuid();
    BEGIN
      ASSERT NOT has_function_privilege('authenticated','yana.cancel_carpool_participation(uuid,uuid,text)','EXECUTE');
      ASSERT NOT has_function_privilege('anon','yana.cancel_carpool_participation(uuid,uuid,text)','EXECUTE');
      ASSERT has_function_privilege('service_role','yana.cancel_carpool_participation(uuid,uuid,text)','EXECUTE');
      INSERT INTO yana.profiles VALUES (d),(p),(p2),(other);
      INSERT INTO yana.carpools (id,driver_id,from_city,to_city,from_geohash,to_geohash,departure_at,seats_total,seats_remaining,status)
        VALUES (r,d,'Frasne','Bouverans','A','B',now()+interval '1 day',3,0,'full');
      INSERT INTO yana.carpool_bookings(carpool_id,passenger_id,seats,total_price_cents,status)
        VALUES(r,p,2,500,'confirmed'),(r,p2,1,250,'confirmed');
      ASSERT yana.cancel_carpool_participation(r,p,'trip') = 'not_found';
      ASSERT yana.cancel_carpool_participation(r,other,'booking') = 'not_found';
      ASSERT yana.cancel_carpool_participation(r,d,'unknown') = 'not_found';
      ASSERT yana.cancel_carpool_participation(r,p,'booking') = 'cancelled';
      ASSERT yana.cancel_carpool_participation(r,p,'booking') = 'cancelled';
      ASSERT (SELECT seats_remaining=2 AND status='open' FROM yana.carpools WHERE id=r);
      ASSERT (SELECT status='confirmed' FROM yana.carpool_bookings WHERE passenger_id=p2);
      UPDATE yana.carpools SET departure_at=now()-interval '1 minute' WHERE id=r;
      ASSERT yana.cancel_carpool_participation(r,d,'trip') = 'unavailable';
      ASSERT yana.cancel_carpool_participation(r,p2,'booking') = 'unavailable';
      UPDATE yana.carpools SET departure_at=now()+interval '1 hour',status='in_progress' WHERE id=r;
      ASSERT yana.cancel_carpool_participation(r,d,'trip') = 'unavailable';
      UPDATE yana.carpools SET status='open' WHERE id=r;
      UPDATE yana.carpool_bookings SET status='disputed' WHERE passenger_id=p2;
      ASSERT yana.cancel_carpool_participation(r,p2,'booking') = 'unavailable';
      ASSERT yana.cancel_carpool_participation(r,d,'trip') = 'unavailable';
      UPDATE yana.carpool_bookings SET status='confirmed' WHERE passenger_id=p2;
      ASSERT yana.cancel_carpool_participation(r,d,'trip') = 'cancelled';
      ASSERT yana.cancel_carpool_participation(r,d,'trip') = 'cancelled';
      ASSERT (SELECT seats_remaining=0 AND status='cancelled' FROM yana.carpools WHERE id=r);
      ASSERT NOT EXISTS (SELECT 1 FROM yana.carpool_bookings WHERE status <> 'cancelled');
    END;
    $test$;
    SELECT 'cancellation_checks_passed';
  `
  // Standalone mode needs no listening socket. A single input batch preserves function bodies.
  const sql = checks.split('\n').filter((line) => line.trim()).join('\n') + '\n\n'
  const result = spawnSync(pg('postgres'), ['--single', '-j', '-D', dir, '-c', 'exit_on_error=on', '-c', 'plpgsql.check_asserts=on', 'postgres'], {
    encoding: 'utf8', input: sql,
  })
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(result.stderr, /ERROR:|FATAL:/)
  assert.match(result.stdout, /= "cancellation_checks_passed"/)
})

test('deux connexions simultanées ne libèrent le groupe qu’une fois', {
  skip: missing && 'PostgreSQL requis',
}, async (t) => {
  const { createRequire } = await import('node:module')
  const { randomInt } = await import('node:crypto')
  const { Pool } = createRequire(import.meta.url)('pg')
  const dir = mkdtempSync(join(tmpdir(), 'yana-cancel-race-'))
  const port = randomInt(49152, 65536)
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const init = spawnSync(pg('initdb'), ['-D', dir, '--no-locale', '-E', 'UTF8', '-U', 'test_admin'], { encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const start = spawnSync(pg('pg_ctl'), ['-D', dir, '-o', `-h 127.0.0.1 -p ${port} -c unix_socket_directories=''`, '-l', join(dir, 'server.log'), '-w', 'start'], { encoding: 'utf8' })
  assert.equal(start.status, 0, start.stderr)
  const pool = new Pool({ user: 'test_admin', host: '127.0.0.1', port, database: 'postgres', max: 3 })
  const closedConnections = []
  pool.on('connect', (client) => {
    closedConnections.push(new Promise((resolve) => client.once('end', resolve)))
  })
  try {
    await pool.query(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA yana;
      CREATE TABLE yana.profiles(id uuid PRIMARY KEY); CREATE TABLE yana.vehicles(id uuid PRIMARY KEY);
      ${schema.match(/CREATE TABLE IF NOT EXISTS yana\.carpools \([\s\S]*?\n\);/)[0]}
      ${schema.match(/CREATE TABLE IF NOT EXISTS yana\.carpool_bookings \([\s\S]*?\n\);/)[0]}
      ${migration}
    `)
    const run = await pool.query(`
      WITH participants AS (INSERT INTO yana.profiles VALUES(gen_random_uuid()),(gen_random_uuid()) RETURNING id)
      SELECT array_agg(id) AS people FROM participants
    `)
    const [driver, passenger] = run.rows[0].people
    const ride = await pool.query(`INSERT INTO yana.carpools(driver_id,from_city,to_city,from_geohash,to_geohash,departure_at,seats_total,seats_remaining,status)
      VALUES($1,'Frasne','Bouverans','a','b',now()+interval '1 hour',3,1,'open') RETURNING id`, [driver])
    const id = ride.rows[0].id
    await pool.query("INSERT INTO yana.carpool_bookings(carpool_id,passenger_id,seats,total_price_cents,status) VALUES($1,$2,2,700,'confirmed')", [id, passenger])
    const first = await pool.connect()
    const second = await pool.connect()
    try {
      const cancel = "select yana.cancel_carpool_participation($1,$2,'booking') as state"
      await first.query('BEGIN')
      const firstCall = await first.query(cancel, [id, passenger])
      const overlap = second.query(cancel, [id, passenger])
      let waiting = false
      for (let attempt = 0; attempt < 50 && !waiting; attempt++) {
        const observed = await pool.query('select wait_event_type from pg_stat_activity where pid=$1', [second.processID])
        waiting = observed.rows[0]?.wait_event_type === 'Lock'
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10))
      }
      await first.query('COMMIT')
      assert.ok(waiting, 'la seconde session doit attendre le verrou de la première')
      assert.equal(firstCall.rows[0].state, 'cancelled')
      assert.equal((await overlap).rows[0].state, 'cancelled')
      assert.deepEqual((await second.query('select seats_remaining,status from yana.carpools where id=$1', [id])).rows, [{ seats_remaining: 3, status: 'open' }])
    } finally {
      await first.query('ROLLBACK')
      first.release()
      second.release()
    }
  } finally {
    await pool.end()
    await Promise.all(closedConnections)
    const stop = spawnSync(pg('pg_ctl'), ['-D', dir, '-m', 'fast', '-w', 'stop'], { encoding: 'utf8' })
    assert.equal(stop.status, 0, stop.stderr)
  }
})
