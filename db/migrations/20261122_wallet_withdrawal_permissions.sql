-- Tighten the existing server-only RPC without rewriting it or creating wallet
-- objects on installations where the optional wallet function is absent.
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('yana.request_withdrawal(uuid,integer,text,text)') IS NULL THEN
    RAISE NOTICE 'request_withdrawal is absent; no wallet objects or permissions changed';
  ELSE
    REVOKE ALL ON FUNCTION yana.request_withdrawal(uuid, integer, text, text)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION yana.request_withdrawal(uuid, integer, text, text)
      TO service_role;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
