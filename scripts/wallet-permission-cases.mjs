// Registered by the single native test entry point; all data is synthetic.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { USER, sqlValue, sql, rawSql, jsonSql, readMigration } from './tree-postgres-fixture.mjs'

const SIGNATURE = 'yana.request_withdrawal(uuid,integer,text,text)'
const canonical = readMigration('20260423_p3_2_wallet_withdrawal_fn.sql')
const incremental = readMigration('20261122_wallet_withdrawal_permissions.sql')
const tightenedGrant = 'FROM PUBLIC, anon, authenticated;'
assert.equal(canonical.split(tightenedGrant).length, 2, 'canonical client revocation exists exactly once')
const legacy = canonical.replace(tightenedGrant, 'FROM PUBLIC;')

async function installLegacyRights() {
  // A fresh CREATE under the source default privileges is essential:
  // CREATE OR REPLACE alone would retain the already tightened ACL.
  await rawSql(`DROP FUNCTION ${SIGNATURE};\n${legacy}`)
}

const rights = () => jsonSql(`SELECT json_build_object(
  'anon', has_function_privilege('anon', '${SIGNATURE}', 'EXECUTE'),
  'authenticated', has_function_privilege('authenticated', '${SIGNATURE}', 'EXECUTE'),
  'service_role', has_function_privilege('service_role', '${SIGNATURE}', 'EXECUTE'),
  'definer', (SELECT prosecdef FROM pg_proc WHERE oid='${SIGNATURE}'::regprocedure),
  'public_execute', EXISTS (SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
    WHERE p.oid='${SIGNATURE}'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE')
);`)
const expectedRights = { anon: false, authenticated: false, service_role: true, definer: true, public_execute: false }
const definition = () => jsonSql(`SELECT json_build_object('oid', oid, 'definition', pg_get_functiondef(oid))
  FROM pg_proc WHERE oid='${SIGNATURE}'::regprocedure;`)
const walletState = () => jsonSql(`SELECT json_build_object(
  'profiles', (SELECT coalesce(json_agg(row_to_json(p) ORDER BY p.id), '[]'::json) FROM yana.profiles p),
  'withdrawals', (SELECT coalesce(json_agg(row_to_json(w) ORDER BY w.id), '[]'::json) FROM yana.withdrawals w),
  'ledger', (SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json) FROM yana.wallet_transactions t)
);`)
const seedBalance = () => sql(`UPDATE yana.profiles SET wallet_balance_cents=2000 WHERE id=${sqlValue(USER)};`, { role: 'service_role' })
const withdraw = role => jsonSql(`SELECT row_to_json(r) FROM yana.request_withdrawal(
  ${sqlValue(USER)}::uuid, 500, 'SYNTHETIC-ONLY', '${'a'.repeat(64)}'
) r;`, { role })

export function registerWalletPermissionTests() {
  test('source default privileges survive PUBLIC-only revocation; canonical ACL removes them', async () => {
    try {
      await installLegacyRights()
      assert.deepEqual(await rights(), { ...expectedRights, anon: true, authenticated: true })
      await rawSql(canonical)
      assert.deepEqual(await rights(), expectedRights)
    } finally { await rawSql(canonical) }
  })

  test('incremental wallet ACL migration preserves the existing function identity and body', async () => {
    try {
      await installLegacyRights()
      const previous = await definition()
      await rawSql(incremental)
      assert.deepEqual(await rights(), expectedRights)
      assert.deepEqual(await definition(), previous)
    } finally { await rawSql(canonical) }
  })

  test('incremental wallet ACL migration explicitly tolerates an absent function without creating it', async () => {
    try {
      await rawSql(`DROP FUNCTION ${SIGNATURE};`)
      await rawSql(incremental)
      assert.equal(await sql(`SELECT to_regprocedure('${SIGNATURE}') IS NULL;`), 't')
    } finally { await rawSql(canonical) }
  })

  for (const role of ['anon', 'authenticated']) {
    test(`${role} withdrawal RPC fails with 42501 before any profile, withdrawal or ledger write`, async () => {
      await seedBalance()
      const previous = await walletState()
      await assert.rejects(withdraw(role), error => /42501/.test(error.message))
      assert.deepEqual(await walletState(), previous)
    })
  }

  test('service_role records exactly one synthetic withdrawal and matching debit', async () => {
    await seedBalance()
    const result = await withdraw('service_role')
    assert.equal(result.error_code, null)
    assert.equal(result.new_balance_cents, 1500)
    const saved = await walletState()
    assert.equal(saved.profiles.find(profile => profile.id === USER).wallet_balance_cents, 1500)
    assert.equal(saved.withdrawals.length, 1)
    assert.equal(saved.ledger.length, 1)
    const withdrawal = saved.withdrawals[0]
    const debit = saved.ledger[0]
    assert.deepEqual([withdrawal.id, withdrawal.user_id, withdrawal.amount_cents, withdrawal.status],
      [result.withdrawal_id, USER, 500, 'pending'])
    assert.deepEqual([debit.user_id, debit.amount_cents, debit.direction, debit.reason, debit.ref_type, debit.ref_id, debit.balance_after_cents],
      [USER, 500, 'debit', 'withdrawal_request', 'withdrawal', result.withdrawal_id, 1500])
  })

  test('native debit-ledger failure rolls back the earlier withdrawal and profile debit', async () => {
    await seedBalance()
    await sql(`CREATE OR REPLACE FUNCTION audit_tree_fixture.fail_wallet() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'synthetic wallet ledger failure'; END; $$;
      CREATE TRIGGER fixture_wallet_failure BEFORE INSERT ON yana.wallet_transactions
        FOR EACH ROW EXECUTE FUNCTION audit_tree_fixture.fail_wallet();`)
    const previous = await walletState()
    await assert.rejects(withdraw('service_role'), error => /synthetic wallet ledger failure/.test(error.message))
    assert.deepEqual(await walletState(), previous)
  })
}
