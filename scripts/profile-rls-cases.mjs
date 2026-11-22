import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { USER, OTHER, THIRD, sqlValue, sql, rawSql, jsonSql, readMigration } from './tree-postgres-fixture.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schema = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8')
const repair = readMigration('20261122_profiles_rls_identity.sql')
const guardBody = readMigration('20261122_atomic_tree_pledges.sql')
  .match(/FUNCTION yana\.guard_profile_tree_totals\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/)?.[1]
const timestampBody = schema.match(/FUNCTION yana\.touch_updated_at\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$/)?.[1]
assert.ok(guardBody && timestampBody, 'reviewed trigger bodies must be available')
for (const body of [guardBody, timestampBody]) {
  assert.ok(repair.includes(createHash('md5').update(body).digest('hex')), 'migration fingerprints match exact source trigger bodies')
}
assert.match(repair, /\nBEGIN;[\s\S]*\nCOMMIT;\s*$/)
const repairBody = repair.slice(repair.indexOf('\nBEGIN;') + '\nBEGIN;'.length).replace(/\nCOMMIT;\s*$/, '')
const profileBlock = schema.match(/DO \$\$ BEGIN\n  -- profiles[\s\S]*?(?=\n  -- vehicles)/)
assert.ok(profileBlock, 'exact original profile policy block must exist')
assert.equal((profileBlock[0].match(/CREATE POLICY/g) || []).length, 2)
const originalPolicies = `${profileBlock[0]}\nEND $$;`
const legacyRls = fs.readFileSync(path.join(ROOT, 'migrations/0003_fix_profiles_rls_recursion.sql'), 'utf8')
const legacyStory = fs.readFileSync(path.join(ROOT, 'migrations/0002_story_shares.sql'), 'utf8')
const legacyFunding = fs.readFileSync(path.join(ROOT, 'migrations/0003_financement_pools.sql'), 'utf8')

const sqlError = (code, detail) => error => error.message.includes(code) && (!detail || error.message.includes(detail))
const profileRows = (options) => jsonSql('SELECT coalesce(json_agg(row_to_json(p) ORDER BY id), \'[]\'::json) FROM yana.profiles p;', options)
const visibleIds = options => jsonSql('SELECT coalesce(json_agg(id ORDER BY id), \'[]\'::json) FROM yana.profiles;', options)

async function sourcePolicies() {
  // These three permissive policies belong only to the earlier guard fixture.
  // The new cases use the unmodified schema.sql predicates and real role grants.
  await rawSql(`
    DROP POLICY IF EXISTS fixture_profile_select ON yana.profiles;
    DROP POLICY IF EXISTS fixture_profile_update ON yana.profiles;
    DROP POLICY IF EXISTS fixture_profile_insert ON yana.profiles;
    DROP POLICY IF EXISTS profiles_self_select ON yana.profiles;
    DROP POLICY IF EXISTS profiles_select_own ON yana.profiles;
    DROP POLICY IF EXISTS profiles_self_update ON yana.profiles;
    DROP FUNCTION IF EXISTS yana.is_super_admin();
    ALTER TABLE yana.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE yana.profiles NO FORCE ROW LEVEL SECURITY;
    ${originalPolicies}
  `)
}

async function repairedPolicies() {
  await sourcePolicies()
  await rawSql(repair)
}

function repairedTest(name, run) {
  test(name, async () => {
    await repairedPolicies()
    await run()
  })
}

async function catalog() {
  return jsonSql(`SELECT json_build_object(
    'columns', (SELECT json_agg(json_build_array(attnum,attname,atttypid,attnotnull,attgenerated) ORDER BY attnum)
      FROM pg_attribute WHERE attrelid='yana.profiles'::regclass AND attnum>0 AND NOT attisdropped),
    'constraints', (SELECT json_agg(json_build_array(conname,pg_get_constraintdef(oid),convalidated) ORDER BY conname)
      FROM pg_constraint WHERE conrelid='yana.profiles'::regclass),
    'policies', (SELECT json_agg(json_build_array(polname,polcmd,polpermissive,polroles,
      pg_get_expr(polqual,polrelid),pg_get_expr(polwithcheck,polrelid)) ORDER BY polname)
      FROM pg_policy WHERE polrelid='yana.profiles'::regclass),
    'helper', (SELECT json_build_array(oid,proowner,prosecdef,provolatile,proconfig,proacl,pg_get_functiondef(oid))
      FROM pg_proc WHERE oid=to_regprocedure('yana.is_super_admin()')),
    'row_security', (SELECT json_build_array(relrowsecurity,relforcerowsecurity,relowner)
      FROM pg_class WHERE oid='yana.profiles'::regclass),
    'triggers', (SELECT json_agg(json_build_array(t.tgname,t.tgenabled,pg_get_triggerdef(t.oid),pg_get_functiondef(t.tgfoid)) ORDER BY t.tgname)
      FROM pg_trigger t WHERE t.tgrelid='yana.profiles'::regclass AND NOT t.tgisinternal)
  );`)
}

function refusesLayout(name, fault, message) {
  repairedTest(name, async () => {
    const before = await catalog()
    const rows = await profileRows()
    // Fault and migration share a transaction. An error closes psql and rolls
    // back the entire fixture; even an unexpected success is explicitly undone.
    await assert.rejects(rawSql(`BEGIN;\n${fault}\n${repairBody}\nROLLBACK;`), sqlError('P0001', message))
    assert.deepEqual(await catalog(), before)
    assert.deepEqual(await profileRows(), rows)
  })
}

export function registerProfileRlsTests() {
  test('original schema.sql profile SELECT reproduces PostgreSQL recursion 42P17', async () => {
    await sourcePolicies()
    for (const user of [USER, OTHER]) {
      await assert.rejects(visibleIds({ role: 'authenticated', user }), sqlError('42P17', 'infinite recursion'))
    }
  })

  test('historical profile migration reproduces missing auth_user_id 42703 without repairing the original policy', async () => {
    await sourcePolicies()
    const before = await catalog()
    await assert.rejects(rawSql(`BEGIN;\n${legacyRls}\nROLLBACK;`), sqlError('42703', 'auth_user_id'))
    assert.deepEqual(await catalog(), before)
    await assert.rejects(visibleIds({ role: 'authenticated' }), sqlError('42P17'))
  })

  test('historical story migration remains incompatible with canonical id and is not claimed fixed', async () => {
    await sourcePolicies()
    await assert.rejects(rawSql(`BEGIN;\n${legacyStory}\nROLLBACK;`), sqlError('42703', 'auth_user_id'))
    assert.equal(await sql("SELECT to_regclass('yana.story_shares') IS NULL;"), 't')
  })

  test('historical funding migration conflicts with canonical pool values and is not silently converted', async () => {
    await sourcePolicies()
    const exactTable = name => {
      const match = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS yana\\.${name} \\([\\s\\S]*?\\n\\);`))
      assert.ok(match, `exact canonical ${name} exists`)
      return match[0]
    }
    await assert.rejects(rawSql(`BEGIN;\n${exactTable('pool_balances')}\n${exactTable('pool_transactions')}\n${legacyFunding}\nROLLBACK;`), sqlError('23514', 'pool_balances_pool_type_check'))
    assert.equal(await sql("SELECT to_regclass('yana.pool_balances') IS NULL;"), 't')
  })

  for (const role of ['user', 'ambassadeur']) {
    repairedTest(`canonical ${role} reads its own profile and cannot read another profile`, async () => {
      await sql(`UPDATE yana.profiles SET role=${sqlValue(role)} WHERE id=${sqlValue(USER)};`)
      assert.deepEqual(await visibleIds({ role: 'authenticated', user: USER }), [USER])
      assert.deepEqual(await visibleIds({ role: 'authenticated', user: OTHER }), [OTHER])
      assert.equal(await sql(`SELECT count(*) FROM yana.profiles WHERE id=${sqlValue(OTHER)};`, { role: 'authenticated' }), '0')
      assert.equal(await sql('SELECT yana.is_super_admin();', { role: 'authenticated' }), 'f')
    })
  }

  repairedTest('server-assigned super_admin can SELECT all profiles without recursion', async () => {
    await sql(`UPDATE yana.profiles SET role='super_admin' WHERE id=${sqlValue(USER)};`, { role: 'service_role' })
    assert.deepEqual(await visibleIds({ role: 'authenticated' }), [USER, OTHER])
    assert.equal(await sql('SELECT yana.is_super_admin();', { role: 'authenticated' }), 't')
  })

  repairedTest('email and metadata claims do not create a database admin role', async () => {
    await sql(`UPDATE yana.profiles SET email='admin@synthetic.invalid', metadata='{"role":"super_admin","is_admin":true}' WHERE id=${sqlValue(USER)};`)
    assert.deepEqual(await visibleIds({ role: 'authenticated' }), [USER])
    assert.equal(await sql('SELECT yana.is_super_admin();', { role: 'authenticated' }), 'f')
  })

  for (const user of ['', USER]) {
    repairedTest(`anon cannot read any profile with ${user ? 'a supplied subject' : 'no subject'}`, async () => {
      assert.deepEqual(await visibleIds({ role: 'anon', user }), [])
      await assert.rejects(sql('SELECT yana.is_super_admin();', { role: 'anon', user }), sqlError('42501'))
    })
  }

  for (const user of ['', THIRD]) {
    repairedTest(`authenticated subject ${user || 'NULL'} without a profile receives no rows or admin access`, async () => {
      assert.deepEqual(await visibleIds({ role: 'authenticated', user }), [])
      assert.equal(await sql('SELECT yana.is_super_admin();', { role: 'authenticated', user }), 'f')
    })
  }

  repairedTest('a malformed subject fails closed instead of exposing profiles', async () => {
    const before = await profileRows()
    await assert.rejects(visibleIds({ role: 'authenticated', user: 'not-a-uuid' }), sqlError('22P02'))
    assert.deepEqual(await profileRows(), before)
  })

  repairedTest('helper uses canonical id, trusted definer, fixed search_path and explicit execution ACL', async () => {
    const security = await jsonSql(`SELECT json_build_object(
      'definer',p.prosecdef,'stable',p.provolatile='s','owner',p.proowner=(SELECT oid FROM pg_roles WHERE rolname='postgres'),
      'config',p.proconfig,'body',p.prosrc,
      'anon',has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_role',has_function_privilege('service_role',p.oid,'EXECUTE'),
      'public_execute',EXISTS(SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
    ) FROM pg_proc p WHERE oid='yana.is_super_admin()'::regprocedure;`)
    assert.deepEqual({ ...security, body: undefined }, { definer: true, stable: true, owner: true,
      config: ['search_path=pg_catalog', 'row_security=off'], anon: false, authenticated: true,
      service_role: true, public_execute: false, body: undefined })
    assert.match(security.body, /WHERE id = auth\.uid\(\) AND role = 'super_admin'/)
    assert.doesNotMatch(security.body, /auth_user_id/)
  })

  repairedTest('temporary profile objects and hostile caller search_path cannot impersonate an admin', async () => {
    const result = await jsonSql(`SET LOCAL search_path=pg_temp,public;
      CREATE TEMP TABLE profiles (id uuid,role text);
      INSERT INTO profiles VALUES (${sqlValue(USER)},'super_admin');
      SELECT json_build_object('admin',yana.is_super_admin(),'visible',
        (SELECT json_agg(id ORDER BY id) FROM yana.profiles));`, { role: 'authenticated' })
    assert.deepEqual(result, { admin: false, visible: [USER] })
  })

  repairedTest('actual owner UPDATE policy permits the six public fields and automatic updated_at', async () => {
    const before = (await profileRows())[0]
    await sql(`UPDATE yana.profiles SET full_name='RLS owner edit',theme='light',locale='en',
      birthdate='2000-01-02',notifications_enabled=false,tutorial_completed=true WHERE id=${sqlValue(USER)};`, { role: 'authenticated' })
    const after = (await profileRows())[0]
    assert.deepEqual(after, { ...before, full_name: 'RLS owner edit', theme: 'light', locale: 'en',
      birthdate: '2000-01-02', notifications_enabled: false, tutorial_completed: true, updated_at: after.updated_at })
    assert.equal(await sql(`SELECT updated_at > ${sqlValue(before.updated_at)}::timestamptz FROM yana.profiles WHERE id=${sqlValue(USER)};`), 't')
  })

  for (const superAdmin of [false, true]) {
    repairedTest(`${superAdmin ? 'admin' : 'ordinary'} client cannot UPDATE another user's profile`, async () => {
      if (superAdmin) await sql(`UPDATE yana.profiles SET role='super_admin' WHERE id=${sqlValue(USER)};`)
      const before = await profileRows()
      assert.equal(await sql(`WITH changed AS (UPDATE yana.profiles SET full_name='unauthorized'
        WHERE id=${sqlValue(OTHER)} RETURNING id) SELECT count(*) FROM changed;`, { role: 'authenticated' }), '0')
      assert.deepEqual(await profileRows(), before)
    })
  }

  for (const [column, value] of [['role', 'super_admin'], ['wallet_balance_cents', '99000'], ['metadata', '{"banned":false}'], ['id', THIRD]]) {
    repairedTest(`the canonical SELECT chain preserves the write guard for ${column}`, async () => {
      const before = await profileRows()
      await assert.rejects(sql(`UPDATE yana.profiles SET ${column}=${sqlValue(value)} WHERE id=${sqlValue(USER)};`, { role: 'authenticated' }), sqlError('42501'))
      assert.deepEqual(await profileRows(), before)
    })
  }

  repairedTest('client INSERT is refused even for its own missing profile', async () => {
    await sql(`DELETE FROM yana.profiles WHERE id=${sqlValue(OTHER)};`)
    await assert.rejects(sql(`INSERT INTO yana.profiles (id,email) VALUES (${sqlValue(OTHER)},'denied@synthetic.invalid');`, { role: 'authenticated', user: OTHER }), sqlError('42501'))
    assert.equal(await sql(`SELECT count(*) FROM yana.profiles WHERE id=${sqlValue(OTHER)};`), '0')
  })

  repairedTest('client DELETE of its own profile remains denied by the actual policy set', async () => {
    const before = await profileRows()
    assert.equal(await sql(`WITH removed AS (DELETE FROM yana.profiles WHERE id=${sqlValue(USER)} RETURNING id)
      SELECT count(*) FROM removed;`, { role: 'authenticated' }), '0')
    assert.deepEqual(await profileRows(), before)
  })

  repairedTest('server protected writes and the original signup trigger remain valid under repaired RLS', async () => {
    await sql(`UPDATE yana.profiles SET role='super_admin',wallet_balance_cents=12345 WHERE id=${sqlValue(USER)};`, { role: 'service_role' })
    await sql(`INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
      (${sqlValue(THIRD)},'rls-signup@synthetic.invalid','{"full_name":"RLS signup","role":"super_admin"}');`, { role: 'supabase_auth_admin' })
    assert.deepEqual(await jsonSql(`SELECT json_build_array(full_name,role,wallet_balance_cents) FROM yana.profiles WHERE id=${sqlValue(THIRD)};`), ['RLS signup', 'user', 0])
    assert.deepEqual(await visibleIds({ role: 'service_role' }), [USER, OTHER, THIRD])
  })

  repairedTest('repair is idempotent, preserves the helper OID and never rewrites profile data', async () => {
    const before = await profileRows()
    const oid = await sql("SELECT 'yana.is_super_admin()'::regprocedure::oid;")
    await rawSql(repair)
    await rawSql(repair)
    assert.equal(await sql("SELECT 'yana.is_super_admin()'::regprocedure::oid;"), oid)
    assert.deepEqual(await profileRows(), before)
    assert.deepEqual(await visibleIds({ role: 'authenticated' }), [USER])
  })

  repairedTest('both known SELECT names are consolidated without retaining the recursive policy', async () => {
    await rawSql(`DROP POLICY profiles_self_select ON yana.profiles;
      ${originalPolicies}
      CREATE POLICY profiles_select_own ON yana.profiles FOR SELECT
        USING (auth.uid() = id OR yana.is_super_admin());`)
    await assert.rejects(visibleIds({ role: 'authenticated' }), sqlError('42P17'))
    await rawSql(repair)
    assert.deepEqual(await jsonSql(`SELECT json_agg(polname ORDER BY polname) FROM pg_policy
      WHERE polrelid='yana.profiles'::regclass;`), ['profiles_self_select', 'profiles_self_update'])
    assert.deepEqual(await visibleIds({ role: 'authenticated' }), [USER])
  })

  repairedTest('FORCE ROW LEVEL SECURITY remains usable with the trusted bypass definer', async () => {
    await sql('ALTER TABLE yana.profiles FORCE ROW LEVEL SECURITY;')
    await rawSql(repair)
    assert.deepEqual(await visibleIds({ role: 'authenticated' }), [USER])
  })

  refusesLayout('an extra auth_user_id identity requires explicit reconciliation',
    'ALTER TABLE yana.profiles ADD COLUMN auth_user_id uuid;', 'ambiguous auth_user_id')
  refusesLayout('a missing identity foreign key stops the migration without partial changes',
    'ALTER TABLE yana.profiles DROP CONSTRAINT profiles_id_fkey;', 'validated id primary key')
  refusesLayout('an unvalidated identity foreign key is not accepted as proof',
    'ALTER TABLE yana.profiles DROP CONSTRAINT profiles_id_fkey; ALTER TABLE yana.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY(id) REFERENCES auth.users(id) NOT VALID;', 'validated id primary key')
  refusesLayout('an additional restrictive policy is preserved and requires review',
    'CREATE POLICY custom_tenant ON yana.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (false);', 'additional profile policy')
  refusesLayout('a customized known SELECT policy is never silently widened',
    'ALTER POLICY profiles_self_select ON yana.profiles USING (false);', 'unrecognized SELECT policy')
  refusesLayout('a customized owner UPDATE policy requires review',
    'ALTER POLICY profiles_self_update ON yana.profiles WITH CHECK (false);', 'unrecognized UPDATE policy')
  refusesLayout('a public owner UPDATE grant requires review',
    'ALTER POLICY profiles_self_update ON yana.profiles TO PUBLIC;', 'unrecognized UPDATE policy')
  refusesLayout('a missing non-null role invariant requires review',
    'ALTER TABLE yana.profiles ALTER COLUMN role DROP NOT NULL;', 'canonical non-null text role')
  refusesLayout('SELECT repair refuses a missing profile write guard trigger',
    'DROP TRIGGER profiles_guard_tree_totals ON yana.profiles;', 'reviewed six-field write guard')
  refusesLayout('SELECT repair refuses a disabled profile write guard trigger',
    'ALTER TABLE yana.profiles DISABLE TRIGGER profiles_guard_tree_totals;', 'reviewed six-field write guard')
  refusesLayout('SELECT repair refuses a silently weakened write guard body',
    'CREATE OR REPLACE FUNCTION yana.guard_profile_tree_totals() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$ BEGIN RETURN NEW; END; $$;', 'reviewed six-field write guard')
  refusesLayout('SELECT repair refuses a guard that changes the caller identity',
    'ALTER FUNCTION yana.guard_profile_tree_totals() SECURITY DEFINER;', 'reviewed six-field write guard')
  refusesLayout('an extra profile trigger requires explicit review before SELECT is repaired',
    'CREATE TRIGGER custom_profile_trigger BEFORE UPDATE ON yana.profiles FOR EACH ROW EXECUTE FUNCTION yana.touch_updated_at();', 'no additional profile trigger')

  repairedTest('an authenticated client cannot apply the migration as a definer owner', async () => {
    const before = await catalog()
    await assert.rejects(rawSql(`BEGIN; SET LOCAL ROLE authenticated; ${repairBody} ROLLBACK;`),
      error => /42501|P0001/.test(error.message))
    assert.deepEqual(await catalog(), before)
  })

  refusesLayout('an owner constrained by FORCE RLS cannot become the security definer',
    `CREATE ROLE fixture_profile_owner NOLOGIN NOBYPASSRLS;
     GRANT USAGE ON SCHEMA yana,auth TO fixture_profile_owner;
     ALTER TABLE yana.profiles OWNER TO fixture_profile_owner;
     ALTER TABLE yana.profiles FORCE ROW LEVEL SECURITY;
     SET LOCAL ROLE fixture_profile_owner;`, 'trusted migration owner')
}
