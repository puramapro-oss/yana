-- Repair ONLY the canonical schema.sql identity: profiles.id = auth.users.id.
-- Apply after schema.sql and the reviewed profile-write guard migration.
-- This supersedes 0003_fix_profiles_rls_recursion.sql for this schema. It does
-- not make the incompatible legacy story/funding migration chain installable.
-- Unknown identity layouts or policies require review; no data is rewritten.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog;
LOCK TABLE yana.profiles IN ACCESS EXCLUSIVE MODE;

DO $preflight$
DECLARE
  profile_id smallint;
  auth_id smallint;
  table_owner oid;
  table_force_rls boolean;
  migrator record;
  item record;
  predicate text;
  check_predicate text;
  authenticated_oid oid := 'authenticated'::regrole;
BEGIN
  SELECT relowner, relforcerowsecurity INTO table_owner, table_force_rls
    FROM pg_catalog.pg_class WHERE oid = 'yana.profiles'::regclass AND relkind = 'r';
  IF table_owner IS NULL THEN
    RAISE EXCEPTION 'YANA profile repair requires the canonical ordinary profiles table';
  END IF;

  SELECT oid, rolsuper, rolbypassrls INTO migrator
    FROM pg_catalog.pg_roles WHERE rolname = current_user;
  IF current_user IN ('anon', 'authenticated', 'service_role') OR NOT
    (migrator.rolsuper OR migrator.rolbypassrls OR
      (migrator.oid = table_owner AND NOT table_force_rls)) THEN
    RAISE EXCEPTION 'YANA profile repair requires a trusted migration owner that bypasses profile RLS';
  END IF;

  SELECT attnum INTO profile_id FROM pg_catalog.pg_attribute
    WHERE attrelid = 'yana.profiles'::regclass AND attname = 'id'
      AND NOT attisdropped AND atttypid = 'uuid'::regtype AND attnotnull
      AND attgenerated = '';
  SELECT attnum INTO auth_id FROM pg_catalog.pg_attribute
    WHERE attrelid = 'auth.users'::regclass AND attname = 'id'
      AND NOT attisdropped AND atttypid = 'uuid'::regtype AND attnotnull;
  IF profile_id IS NULL OR auth_id IS NULL OR
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid = 'yana.profiles'::regclass AND contype = 'p'
        AND conkey = ARRAY[profile_id]::smallint[] AND convalidated) OR
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid = 'yana.profiles'::regclass AND contype = 'f'
        AND confrelid = 'auth.users'::regclass AND convalidated
        AND conkey = ARRAY[profile_id]::smallint[]
        AND confkey = ARRAY[auth_id]::smallint[]) THEN
    RAISE EXCEPTION 'YANA profile repair requires the validated id primary key and id -> auth.users.id foreign key';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'yana.profiles'::regclass AND attname = 'auth_user_id' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'YANA profile repair refuses an ambiguous auth_user_id identity; review the existing mapping';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'yana.profiles'::regclass AND attname = 'role'
      AND NOT attisdropped AND atttypid = 'text'::regtype AND attnotnull) THEN
    RAISE EXCEPTION 'YANA profile repair requires the canonical non-null text role';
  END IF;

  -- Repairing SELECT also makes the existing owner UPDATE usable. Require the
  -- already-reviewed six-field guard first, or a client could promote its role.
  -- Fingerprints identify that exact migration contract, not historic data.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_trigger t ON t.tgfoid = p.oid
    WHERE p.oid = pg_catalog.to_regprocedure('yana.guard_profile_tree_totals()')
      AND p.prorettype = 'trigger'::regtype AND NOT p.prosecdef
      AND p.proconfig = ARRAY['search_path=pg_catalog']::text[]
      AND pg_catalog.md5(p.prosrc) = 'e53206350808464401ceb80433565145'
      AND t.tgrelid = 'yana.profiles'::regclass
      AND t.tgname = 'profiles_guard_tree_totals' AND NOT t.tgisinternal
      AND t.tgenabled IN ('O','A') AND t.tgtype = 23
      AND t.tgnargs = 0 AND t.tgqual IS NULL AND t.tgattr = ''::int2vector) THEN
    RAISE EXCEPTION 'YANA profile repair requires the reviewed six-field write guard and its active unconditional trigger';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_trigger t ON t.tgfoid = p.oid
    WHERE p.oid = pg_catalog.to_regprocedure('yana.touch_updated_at()')
      AND p.prorettype = 'trigger'::regtype AND NOT p.prosecdef
      AND pg_catalog.md5(p.prosrc) = 'e7a0919a4073eaabf72630cc53a76237'
      AND t.tgrelid = 'yana.profiles'::regclass
      AND t.tgname = 'profiles_touch_updated' AND NOT t.tgisinternal
      AND t.tgenabled IN ('O','A') AND t.tgtype = 19
      AND t.tgnargs = 0 AND t.tgqual IS NULL AND t.tgattr = ''::int2vector) OR
    EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
      WHERE tgrelid = 'yana.profiles'::regclass AND NOT tgisinternal
        AND tgname NOT IN ('profiles_guard_tree_totals', 'profiles_touch_updated')) THEN
    RAISE EXCEPTION 'YANA profile repair requires the reviewed timestamp trigger and no additional profile trigger';
  END IF;

  -- The expected legacy and repaired expressions are compared as PostgreSQL
  -- renders them, ignoring whitespace only. Never silently replace a policy
  -- with a custom tenant filter, restrictive mode, grant or write predicate.
  FOR item IN SELECT * FROM pg_catalog.pg_policy
    WHERE polrelid = 'yana.profiles'::regclass LOOP
    predicate := pg_catalog.regexp_replace(pg_catalog.pg_get_expr(item.polqual, item.polrelid), '[[:space:]]+', '', 'g');
    check_predicate := pg_catalog.regexp_replace(pg_catalog.pg_get_expr(item.polwithcheck, item.polrelid), '[[:space:]]+', '', 'g');
    IF item.polname IN ('profiles_self_select', 'profiles_select_own') THEN
      IF item.polcmd <> 'r' OR NOT item.polpermissive OR item.polwithcheck IS NOT NULL
        OR NOT (item.polroles = ARRAY[authenticated_oid]::oid[] OR
          (item.polname = 'profiles_select_own' AND item.polroles = ARRAY[0]::oid[]))
        OR predicate IS NULL OR predicate NOT IN (
          '((id=auth.uid())OR(EXISTS(SELECT1FROMyana.profilespWHERE((p.id=auth.uid())AND(p.role=''super_admin''::text)))))',
          '((id=auth.uid())ORyana.is_super_admin())',
          '((auth.uid()=id)ORyana.is_super_admin())'
        ) THEN
        RAISE EXCEPTION 'YANA profile repair refuses an unrecognized SELECT policy definition: %', item.polname;
      END IF;
    ELSIF item.polname = 'profiles_self_update' THEN
      IF item.polcmd <> 'w' OR NOT item.polpermissive
        OR item.polroles <> ARRAY[authenticated_oid]::oid[]
        OR predicate IS DISTINCT FROM '(id=auth.uid())'
        OR check_predicate IS DISTINCT FROM '(id=auth.uid())' THEN
        RAISE EXCEPTION 'YANA profile repair refuses an unrecognized UPDATE policy definition';
      END IF;
    ELSE
      RAISE EXCEPTION 'YANA profile repair refuses an additional profile policy: %', item.polname;
    END IF;
  END LOOP;
END;
$preflight$;

CREATE OR REPLACE FUNCTION yana.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM yana.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$function$;

-- A previous helper may have another owner. Bind the definer to the trusted
-- migrator checked above, so FORCE RLS/ownership cannot reintroduce recursion.
DO $owner$
BEGIN
  EXECUTE pg_catalog.format('ALTER FUNCTION yana.is_super_admin() OWNER TO %I', current_user);
END;
$owner$;
REVOKE ALL ON FUNCTION yana.is_super_admin() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION yana.is_super_admin() TO authenticated, service_role;

ALTER TABLE yana.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self_select ON yana.profiles;
DROP POLICY IF EXISTS profiles_select_own ON yana.profiles;
CREATE POLICY profiles_self_select ON yana.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR yana.is_super_admin());

-- The existing owner-only UPDATE policy and generic six-field write guard are
-- deliberately retained. Authenticated admins gain no client write authority.
NOTIFY pgrst, 'reload schema';
COMMIT;
