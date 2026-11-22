// Native PostgreSQL qualification in the disposable GitHub Actions service.
// It cannot accept a connection URL or address a persistent/application DB.
import assert from 'node:assert/strict'
import { execFile, execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { handlers, USER } from './check-tree-invariants.mjs'

const CONTAINER = process.env.YANA_TREE_TEST_CONTAINER || ''
const DATABASE = 'yana_tree_ci'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OTHER = '00000000-0000-4000-8000-000000000002'
const THIRD = '00000000-0000-4000-8000-000000000003'
const TRIP = '00000000-0000-4000-8000-000000000011'
if (process.env.GITHUB_ACTIONS !== 'true' || !/^[a-f0-9]{12,64}$/.test(CONTAINER)) {
  throw new Error('Only the explicitly configured disposable GitHub Actions PostgreSQL service is allowed')
}
const image = execFileSync('docker', ['inspect', '--format', '{{.Config.Image}}', CONTAINER], { encoding: 'utf8' }).trim()
assert.equal(image, 'postgres:17', 'test target must be the disposable service image')

const sqlValue = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const psqlArgs = ['exec', '-i', CONTAINER, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-U', 'postgres', '-d', DATABASE]

function rawSql(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile('docker', psqlArgs, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        const failure = new Error(stderr.trim() || error.message)
        failure.stderr = stderr
        reject(failure)
      } else resolve(stdout.trim())
    })
    child.stdin.end(sql)
  })
}

function sql(query, { role = 'postgres', user = USER, app = 'yana-tree-test' } = {}) {
  assert.ok(['postgres', 'service_role', 'anon', 'authenticated', 'supabase_auth_admin'].includes(role))
  return rawSql(`BEGIN;\nSET LOCAL ROLE ${role};\nSET LOCAL "request.jwt.claim.sub" = ${sqlValue(user)};\nSET LOCAL application_name = ${sqlValue(app)};\n${query}\nCOMMIT;\n`)
}

async function jsonSql(query, options) { return JSON.parse(await sql(query, options)) }

function exactTable(schema, name) {
  const expression = new RegExp(`CREATE TABLE IF NOT EXISTS yana\\.${name} \\([\\s\\S]*?\\n\\);`)
  const match = schema.match(expression)
  assert.ok(match, `exact ${name} DDL exists`)
  return match[0]
}

async function setupDatabase() {
  assert.equal(await sql('SELECT current_database();'), DATABASE)
  const schema = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8')
  const signupFunction = schema.match(/CREATE OR REPLACE FUNCTION yana\.handle_new_user\(\)[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/)
  assert.ok(signupFunction, 'exact existing server signup function exists')
  const co2Source = fs.readFileSync(path.join(ROOT, 'src/lib/co2.ts'), 'utf8')
  assert.match(co2Source, /export const CO2_TO_TREE_KG\s*=\s*10\b/, 'SQL and application threshold agree')
  await rawSql(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE ROLE supabase_auth_admin NOLOGIN;
    CREATE SCHEMA auth;
    CREATE SCHEMA yana;
    CREATE SCHEMA audit_tree_fixture;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text NOT NULL, raw_user_meta_data jsonb NOT NULL DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, yana TO anon, authenticated, service_role, supabase_auth_admin;
    GRANT INSERT ON auth.users TO supabase_auth_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA yana GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA yana GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
    ${exactTable(schema, 'profiles')}
    CREATE TABLE yana.trips (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES yana.profiles(id));
    ${exactTable(schema, 'trees_planted')}
    CREATE INDEX trees_user_idx ON yana.trees_planted(user_id, planted_at DESC);
    ${signupFunction[0]}
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION yana.handle_new_user();
    ALTER TABLE yana.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE yana.trees_planted ENABLE ROW LEVEL SECURITY;
    -- Explicit NON-recursive fixture policies. Do not apply the inconsistent
    -- profiles_self_select / auth_user_id historical migration chain here.
    CREATE POLICY fixture_profile_select ON yana.profiles FOR SELECT
      TO anon, authenticated USING (id = auth.uid());
    CREATE POLICY fixture_profile_update ON yana.profiles FOR UPDATE
      TO anon, authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
    -- INSERT/anon allowance intentionally exercises the new guard even if an
    -- installation later grants these operations. It is fixture-only.
    CREATE POLICY fixture_profile_insert ON yana.profiles FOR INSERT
      TO anon, authenticated WITH CHECK (id = auth.uid());
    CREATE POLICY trees_owner_select ON yana.trees_planted FOR SELECT
      TO authenticated USING (user_id = auth.uid());
  `)
  await rawSql(fs.readFileSync(path.join(ROOT, 'db/migrations/20261122_atomic_tree_pledges.sql'), 'utf8'))
}

async function reset({ co2 = 10, counter = 0, ledger = 0 } = {}) {
  await sql(`
    TRUNCATE yana.trees_planted, yana.trips, yana.profiles, auth.users CASCADE;
    INSERT INTO auth.users (id, email) VALUES
      (${sqlValue(USER)}, 'one@synthetic.invalid'),
      (${sqlValue(OTHER)}, 'two@synthetic.invalid');
    UPDATE yana.profiles SET co2_offset_total_kg = ${sqlValue(co2)}::numeric,
      trees_planted_total = ${counter} WHERE id = ${sqlValue(USER)};
    ${ledger ? `INSERT INTO yana.trees_planted (user_id, provider, tree_count, co2_offset_kg)
      VALUES (${sqlValue(USER)}, 'manual', ${ledger}, 10);` : ''}
  `)
}

async function cleanupFailures() {
  await sql(`
    DROP TRIGGER IF EXISTS fixture_insert_failure ON yana.trees_planted;
    DROP TRIGGER IF EXISTS fixture_update_failure ON yana.profiles;
  `)
}

async function state() {
  return jsonSql(`SELECT json_build_object(
    'co2', p.co2_offset_total_kg, 'counter', p.trees_planted_total,
    'trees', (SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json) FROM yana.trees_planted t WHERE t.user_id = p.id),
    'sum', (SELECT coalesce(sum(t.tree_count), 0) FROM yana.trees_planted t WHERE t.user_id = p.id)
  ) FROM yana.profiles p WHERE p.id = ${sqlValue(USER)};`)
}

async function rpc({ user = USER, trip = null, role = 'service_role' } = {}) {
  return jsonSql(`SELECT row_to_json(r) FROM yana.record_manual_tree_pledge(${sqlValue(user)}::uuid, ${sqlValue(trip)}::uuid, 'synthetic-receipt') AS r;`, { role })
}

// Real database adapter for the actual route handlers. Only receipt creation
// and identity are synthetic. Every write reaches the PostgreSQL RPC as
// service_role in a separate transaction/connection. Legacy writes are absent.
class PgAdapter {
  constructor(label) { this.label = label; this.preparedReceipts = 0 }
  from(table) { assert.equal(table, 'profiles', 'no legacy direct ledger writes'); return new PgQuery(this) }
  rpc(name, args) {
    assert.equal(name, 'record_manual_tree_pledge')
    const pending = jsonSql(`SELECT row_to_json(r) FROM yana.record_manual_tree_pledge(
      ${sqlValue(args.p_user_id)}::uuid, ${sqlValue(args.p_trip_id)}::uuid, ${sqlValue(args.p_ots_proof)}
    ) AS r;`, { role: 'service_role', app: this.label })
      .then(data => ({ data, error: null }), error => ({ data: null, error: { message: error.message } }))
    return { single: () => pending }
  }
}

class PgQuery {
  constructor(db) { this.db = db; this.filters = []; this.singleRow = false; this.count = 100 }
  select() { return this }
  eq(column, value) { assert.equal(column, 'id'); this.filters.push(`id = ${sqlValue(value)}::uuid`); return this }
  gte(column, value) { assert.equal(column, 'co2_offset_total_kg'); assert.equal(value, 10); this.filters.push('co2_offset_total_kg >= 10'); return this }
  order(column) { assert.equal(column, 'co2_offset_total_kg'); return this }
  limit(count) { assert.equal(count, 100); this.count = count; return this }
  maybeSingle() { this.singleRow = true; return this }
  then(resolve, reject) {
    const query = `SELECT row_to_json(p) FROM (
      SELECT id, co2_offset_total_kg, trees_planted_total FROM yana.profiles
      ${this.filters.length ? `WHERE ${this.filters.join(' AND ')}` : ''}
      ORDER BY co2_offset_total_kg DESC LIMIT ${this.count}
    ) AS p;`
    return sql(query, { role: 'service_role', app: `${this.db.label}-read` }).then(output => {
      const rows = output ? output.split('\n').map(line => JSON.parse(line)) : []
      return { data: this.singleRow ? (rows[0] || null) : rows, error: null }
    }, error => ({ data: null, error: { message: error.message } })).then(resolve, reject)
  }
}

const route = label => handlers(new PgAdapter(label))

async function concurrentlyLocked(actions) {
  const blocker = spawn('docker', psqlArgs, { stdio: ['pipe', 'pipe', 'pipe'] })
  let blockerOutput = ''
  let blockerErrors = ''
  blocker.stdout.on('data', chunk => { blockerOutput += chunk })
  blocker.stderr.on('data', chunk => { blockerErrors += chunk })
  const exited = new Promise((resolve, reject) => {
    blocker.on('error', reject)
    blocker.on('exit', code => code === 0 ? resolve() : reject(new Error(blockerErrors)))
  })
  blocker.stdin.write(`BEGIN; SELECT 1 FROM yana.profiles WHERE id=${sqlValue(USER)} FOR UPDATE; SELECT 'lock-ready';\n`)
  const waitFor = async predicate => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (await predicate()) return
      await delay(50)
    }
    throw new Error('Native concurrency barrier was not reached')
  }
  let requests = []
  try {
    await waitFor(async () => blockerOutput.includes('lock-ready'))
    const labels = actions.map((action, index) => `yana-tree-${action}-${index}`)
    requests = actions.map((action, index) => route(labels[index])[action]())
    // Require proof that BOTH independent RPC connections are blocked by the
    // real profile lock before releasing it. A serial mock cannot pass this.
    await waitFor(async () => Number(await sql(`SELECT count(*) FROM pg_stat_activity
      WHERE application_name IN (${labels.map(sqlValue).join(',')}) AND wait_event_type='Lock';`)) === actions.length)
    process.stdout.write(`NATIVE_LOCK_WAIT ${labels.join(',')} count=${actions.length}\n`)
    blocker.stdin.end('COMMIT;\n\\q\n')
    await exited
    return Promise.all(requests)
  } finally {
    if (!blocker.stdin.writableEnded) {
      blocker.stdin.end('ROLLBACK;\n\\q\n')
      await exited
    }
    await Promise.allSettled(requests)
  }
}

export { USER, OTHER, THIRD, TRIP, sqlValue, sql, jsonSql, reset, state, rpc, route, concurrentlyLocked, setupDatabase, cleanupFailures }
