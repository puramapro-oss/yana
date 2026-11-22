import assert from 'node:assert/strict'
import { before, beforeEach, afterEach, test } from 'node:test'
import {
  USER, OTHER, THIRD, TRIP, sqlValue, sql, jsonSql, reset, state, rpc,
  route, concurrentlyLocked, setupDatabase, cleanupFailures,
} from './tree-postgres-fixture.mjs'
import { registerWalletPermissionTests } from './wallet-permission-cases.mjs'

before(setupDatabase)
beforeEach(async () => { await reset() })
afterEach(cleanupFailures)

const profileState = () => jsonSql(`SELECT row_to_json(p) FROM yana.profiles p WHERE id=${sqlValue(USER)};`)

test('single real handler claim commits one row and one counter', async () => {
  const response = await route('single-claim').claim()
  const saved = await state()
  assert.equal(response.status, 200)
  assert.equal(response.body.provider, 'manual')
  assert.equal(saved.counter, 1)
  assert.equal(saved.sum, 1)
  assert.equal(saved.trees.length, 1)
})

test('cron native INSERT failure leaves credit and ledger unchanged and returns HTTP 500', async () => {
  await sql(`CREATE OR REPLACE FUNCTION audit_tree_fixture.fail_insert() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN RAISE EXCEPTION 'synthetic insert failure'; END; $$;
    CREATE TRIGGER fixture_insert_failure BEFORE INSERT ON yana.trees_planted
      FOR EACH ROW EXECUTE FUNCTION audit_tree_fixture.fail_insert();`)
  const previous = await state()
  const response = await route('insert-failure').cron()
  assert.equal(response.status, 500)
  assert.equal(response.body.failed, 1)
  assert.equal(response.body.planted, 0)
  assert.deepEqual(await state(), previous)
})

test('claim native counter UPDATE failure rolls back the already inserted receipt', async () => {
  await sql(`CREATE OR REPLACE FUNCTION audit_tree_fixture.fail_update() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN RAISE EXCEPTION 'synthetic update failure'; END; $$;
    CREATE TRIGGER fixture_update_failure BEFORE UPDATE OF trees_planted_total ON yana.profiles
      FOR EACH ROW EXECUTE FUNCTION audit_tree_fixture.fail_update();`)
  const previous = await state()
  assert.equal((await route('update-failure').claim()).status, 500)
  assert.deepEqual(await state(), previous)
})

for (const actions of [['claim', 'claim'], ['claim', 'cron'], ['cron', 'cron']]) {
  test(`native row lock serializes ${actions.join(' + ')}`, async () => {
    const expected = actions.every(action => action === 'cron') ? 3 : 1
    await reset({ co2: expected * 10 })
    const responses = await concurrentlyLocked(actions)
    const saved = await state()
    assert.equal(saved.counter, expected)
    assert.equal(saved.sum, expected)
    assert.equal(saved.trees.length, expected)
    assert.ok(responses.every(response => [200, 400].includes(response.status)))
  })
}

for (const options of [{ co2: 20, counter: 0, ledger: 1 }, { co2: 20, counter: 1, ledger: 0 }]) {
  test(`historical counter=${options.counter} and ledger=${options.ledger} require reconciliation without rewriting`, async () => {
    await reset(options)
    const previous = await state()
    const response = await route('historical-mismatch').claim()
    assert.equal(response.status, 409)
    assert.equal(response.body.code, 'reconciliation_required')
    assert.deepEqual(await state(), previous)
  })
}

test('cron exposes historical reconciliation failure', async () => {
  await reset({ co2: 20, counter: 0, ledger: 1 })
  const previous = await state()
  const response = await route('cron-mismatch').cron()
  assert.equal(response.status, 500)
  assert.equal(response.body.reconciliation_required, 1)
  assert.deepEqual(await state(), previous)
})

for (const options of [{ co2: 'NaN' }, { co2: -1 }, { co2: 10, counter: -1 }]) {
  test(`RPC refuses invalid profile ${JSON.stringify(options)}`, async () => {
    await reset(options)
    const previous = await state()
    assert.equal((await rpc()).error_code, 'invalid_profile')
    assert.deepEqual(await state(), previous)
  })
}

for (const invalid of [{ tree_count: -1, co2: 10 }, { tree_count: 0, co2: 10 }, { tree_count: 0, co2: 'NaN' }, { tree_count: 0, co2: -1 }]) {
  test(`RPC refuses invalid ledger ${JSON.stringify(invalid)}`, async () => {
    await sql(`INSERT INTO yana.trees_planted (user_id, provider, tree_count, co2_offset_kg)
      VALUES (${sqlValue(USER)}, 'manual', ${invalid.tree_count}, ${sqlValue(invalid.co2)}::numeric);`)
    const previous = await state()
    assert.equal((await rpc()).error_code, 'reconciliation_required')
    assert.deepEqual(await state(), previous)
  })
}

test('RPC rechecks eligibility and does not consume an exhausted threshold', async () => {
  await reset({ co2: 10, counter: 1, ledger: 1 })
  const previous = await state()
  assert.equal((await rpc()).error_code, 'not_eligible')
  assert.deepEqual(await state(), previous)
})

test('RPC rejects another user trip and preserves the caller own trip', async () => {
  await sql(`INSERT INTO yana.trips (id, user_id) VALUES (${sqlValue(TRIP)}, ${sqlValue(OTHER)});`)
  const previous = await state()
  assert.equal((await rpc({ trip: TRIP })).error_code, 'invalid_trip')
  assert.deepEqual(await state(), previous)
  await sql(`UPDATE yana.trips SET user_id=${sqlValue(USER)} WHERE id=${sqlValue(TRIP)};`)
  const result = await rpc({ trip: TRIP })
  assert.equal(result.error_code, null)
  assert.equal(result.tree.trip_id, TRIP)
})

test('function security and explicit ACL remove default PUBLIC/anon/authenticated execution', async () => {
  const rights = await jsonSql(`SELECT json_build_object(
    'anon', has_function_privilege('anon', 'yana.record_manual_tree_pledge(uuid,uuid,text)', 'EXECUTE'),
    'authenticated', has_function_privilege('authenticated', 'yana.record_manual_tree_pledge(uuid,uuid,text)', 'EXECUTE'),
    'service_role', has_function_privilege('service_role', 'yana.record_manual_tree_pledge(uuid,uuid,text)', 'EXECUTE'),
    'rpc_definer', (SELECT prosecdef FROM pg_proc WHERE oid='yana.record_manual_tree_pledge(uuid,uuid,text)'::regprocedure),
    'guard_definer', (SELECT prosecdef FROM pg_proc WHERE oid='yana.guard_profile_tree_totals()'::regprocedure),
    'guard_anon', has_function_privilege('anon', 'yana.guard_profile_tree_totals()', 'EXECUTE'),
    'guard_authenticated', has_function_privilege('authenticated', 'yana.guard_profile_tree_totals()', 'EXECUTE'),
    'public_execute', EXISTS (SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
      WHERE p.oid='yana.record_manual_tree_pledge(uuid,uuid,text)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE')
  );`)
  assert.deepEqual(rights, { anon: false, authenticated: false, service_role: true, rpc_definer: true, guard_definer: false, guard_anon: false, guard_authenticated: false, public_execute: false })
})

test('profile guard precedes the exact existing automatic timestamp trigger', async () => {
  const triggers = await jsonSql(`SELECT json_agg(tgname ORDER BY tgname) FROM pg_trigger
    WHERE tgrelid='yana.profiles'::regclass AND NOT tgisinternal AND tgenabled='O'
      AND tgname IN ('profiles_guard_tree_totals','profiles_touch_updated');`)
  assert.deepEqual(triggers, ['profiles_guard_tree_totals', 'profiles_touch_updated'])
})

for (const role of ['anon', 'authenticated']) {
  test(`${role} cannot invoke the privileged RPC`, async () => {
    const previous = await state()
    await assert.rejects(rpc({ role }), error => /42501/.test(error.message))
    assert.deepEqual(await state(), previous)
  })

  test(`${role} can edit all six public fields while the timestamp trigger runs`, async () => {
    const previous = await profileState()
    await sql(`UPDATE yana.profiles SET full_name='Synthetic profile edit',
      theme='light',locale='en',birthdate='2000-01-02',
      notifications_enabled=false,tutorial_completed=true,
      co2_offset_total_kg=co2_offset_total_kg, trees_planted_total=trees_planted_total,
      role=role, plan=plan, wallet_balance_cents=wallet_balance_cents,updated_at=updated_at
      WHERE id=${sqlValue(USER)};`, { role })
    const saved = await profileState()
    assert.equal(await sql(`SELECT updated_at > ${sqlValue(previous.updated_at)}::timestamptz
      FROM yana.profiles WHERE id=${sqlValue(USER)};`), 't')
    assert.deepEqual(saved, { ...previous, full_name: 'Synthetic profile edit',
      theme: 'light', locale: 'en', birthdate: '2000-01-02',
      notifications_enabled: false, tutorial_completed: true, updated_at: saved.updated_at })
  })

  for (const { column, value } of [
    { column: 'co2_offset_total_kg', value: 99 },
    { column: 'trees_planted_total', value: 99 },
    { column: 'role', value: 'super_admin' },
    { column: 'plan', value: 'legende' },
    { column: 'wallet_balance_cents', value: 99000 },
    { column: 'email', value: 'changed@synthetic.invalid' },
    { column: 'stripe_customer_id', value: 'cus_synthetic_client' },
    { column: 'metadata', value: '{"banned":false}' },
    { column: 'plan_multiplier', value: 99 },
    { column: 'daily_questions', value: 99 },
    { column: 'daily_questions_reset_at', value: '2099-01-01' },
    { column: 'updated_at', value: '2100-01-01T00:00:00Z' },
  ]) {
    test(`${role} cannot UPDATE ${column}`, async () => {
      if (column === 'metadata') {
        await sql(`UPDATE yana.profiles SET metadata='{"banned":true}' WHERE id=${sqlValue(USER)};`)
      }
      const previous = await profileState()
      await assert.rejects(sql(`UPDATE yana.profiles SET ${column}=${sqlValue(value)} WHERE id=${sqlValue(USER)};`, { role }), error => /42501/.test(error.message))
      assert.deepEqual(await profileState(), previous)
    })
  }

  test(`${role} cannot INSERT a profile even with default protected fields`, async () => {
    await sql(`DELETE FROM yana.profiles WHERE id=${sqlValue(OTHER)};`)
    await assert.rejects(sql(`INSERT INTO yana.profiles (id,email,full_name)
      VALUES (${sqlValue(OTHER)},'insert@synthetic.invalid','Synthetic default insert');`, { role, user: OTHER }), error => /42501/.test(error.message))
    assert.equal(await sql(`SELECT count(*) FROM yana.profiles WHERE id=${sqlValue(OTHER)};`), '0')
  })

  test(`${role} cannot INSERT a profile with authority, billing or moderation data`, async () => {
    await sql(`DELETE FROM yana.profiles WHERE id=${sqlValue(OTHER)};`)
    await assert.rejects(sql(`INSERT INTO yana.profiles
      (id,email,role,plan,wallet_balance_cents,stripe_customer_id,metadata)
      VALUES (${sqlValue(OTHER)},'insert@synthetic.invalid','super_admin','legende',99000,
        'cus_synthetic_client','{"banned":false}');`, { role, user: OTHER }), error => /42501/.test(error.message))
    assert.equal(await sql(`SELECT count(*) FROM yana.profiles WHERE id=${sqlValue(OTHER)};`), '0')
  })
}

test('service_role retains protected writes and profile creation', async () => {
  await sql(`UPDATE yana.profiles SET co2_offset_total_kg=20,trees_planted_total=1,
    role='super_admin',plan='legende',wallet_balance_cents=12500,
    email='server-edit@synthetic.invalid',stripe_customer_id='cus_synthetic_server',
    metadata='{"banned":true}',plan_multiplier=10,daily_questions=12
    WHERE id=${sqlValue(USER)};`, { role: 'service_role' })
  assert.equal((await state()).co2, 20)
  assert.equal((await state()).counter, 1)
  assert.deepEqual(await jsonSql(`SELECT json_build_array(role,plan,wallet_balance_cents,
    email,stripe_customer_id,metadata,plan_multiplier,daily_questions)
    FROM yana.profiles WHERE id=${sqlValue(USER)};`),
  ['super_admin', 'legende', 12500, 'server-edit@synthetic.invalid', 'cus_synthetic_server', { banned: true }, 10, 12])
  await sql(`DELETE FROM yana.profiles WHERE id=${sqlValue(OTHER)};`)
  await sql(`INSERT INTO yana.profiles (id,email,co2_offset_total_kg,trees_planted_total,role,plan,wallet_balance_cents)
    VALUES (${sqlValue(OTHER)},'server@synthetic.invalid',20,1,'ambassadeur','essentiel',500);`, { role: 'service_role' })
  assert.deepEqual(await jsonSql(`SELECT json_build_array(co2_offset_total_kg,trees_planted_total,role,plan,wallet_balance_cents)
    FROM yana.profiles WHERE id=${sqlValue(OTHER)};`), [20, 1, 'ambassadeur', 'essentiel', 500])
})

test('existing SECURITY DEFINER signup trigger still creates zeroed profiles', async () => {
  await sql(`INSERT INTO auth.users (id,email,raw_user_meta_data)
    VALUES (${sqlValue(THIRD)},'signup@synthetic.invalid','{"full_name":"Synthetic signup"}');`, { role: 'supabase_auth_admin' })
  const created = await jsonSql(`SELECT json_build_array(full_name,co2_offset_total_kg,trees_planted_total,role,plan,wallet_balance_cents)
    FROM yana.profiles WHERE id=${sqlValue(THIRD)};`)
  assert.deepEqual(created, ['Synthetic signup', 0, 0, 'user', 'free', 0])
})

// Register in this same process so all cases share the hooks and run serially.
registerWalletPermissionTests()
