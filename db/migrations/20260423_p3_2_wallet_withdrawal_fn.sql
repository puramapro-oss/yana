-- P3.2 /wallet — fonction atomique de demande de retrait
-- Anti-double-retrait : lock pessimiste FOR UPDATE sur profiles
-- Transaction unique : check balance → insert withdrawal → decrement balance → insert tx

CREATE OR REPLACE FUNCTION yana.request_withdrawal(
  p_user_id uuid,
  p_amount_cents integer,
  p_iban_masked text,
  p_iban_hash text
)
RETURNS TABLE (
  withdrawal_id uuid,
  new_balance_cents bigint,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = yana, public
AS $$
DECLARE
  v_balance bigint;
  v_pending_count int;
  v_withdrawal_id uuid;
BEGIN
  -- Input validation (belt-and-braces, le endpoint fait déjà Zod)
  IF p_amount_cents < 500 THEN
    RETURN QUERY SELECT NULL::uuid, 0::bigint, 'AMOUNT_BELOW_MIN'::text;
    RETURN;
  END IF;

  IF p_iban_masked IS NULL OR length(p_iban_masked) < 4 OR p_iban_hash IS NULL OR length(p_iban_hash) < 32 THEN
    RETURN QUERY SELECT NULL::uuid, 0::bigint, 'INVALID_IBAN'::text;
    RETURN;
  END IF;

  -- Verrou pessimiste : lock row profile jusqu'à fin de transaction
  SELECT wallet_balance_cents INTO v_balance
  FROM yana.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 0::bigint, 'USER_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Check balance suffisante
  IF v_balance < p_amount_cents THEN
    RETURN QUERY SELECT NULL::uuid, v_balance, 'INSUFFICIENT_BALANCE'::text;
    RETURN;
  END IF;

  -- Check aucun retrait en cours (pending ou processing) pour ce user
  SELECT count(*) INTO v_pending_count
  FROM yana.withdrawals
  WHERE user_id = p_user_id AND status IN ('pending', 'processing');

  IF v_pending_count > 0 THEN
    RETURN QUERY SELECT NULL::uuid, v_balance, 'WITHDRAWAL_IN_PROGRESS'::text;
    RETURN;
  END IF;

  -- Insert withdrawal
  INSERT INTO yana.withdrawals (user_id, amount_cents, iban_masked, iban_hash, status)
  VALUES (p_user_id, p_amount_cents, p_iban_masked, p_iban_hash, 'pending')
  RETURNING id INTO v_withdrawal_id;

  -- Decrement wallet_balance_cents atomique
  UPDATE yana.profiles
  SET wallet_balance_cents = wallet_balance_cents - p_amount_cents
  WHERE id = p_user_id
  RETURNING wallet_balance_cents INTO v_balance;

  -- Log wallet_transaction
  INSERT INTO yana.wallet_transactions (user_id, amount_cents, direction, reason, ref_type, ref_id, balance_after_cents)
  VALUES (p_user_id, p_amount_cents, 'debit', 'withdrawal_request', 'withdrawal', v_withdrawal_id, v_balance);

  RETURN QUERY SELECT v_withdrawal_id, v_balance, NULL::text;
END;
$$;

-- Permissions : appelable uniquement via service_role (l'API route serveur)
REVOKE ALL ON FUNCTION yana.request_withdrawal(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION yana.request_withdrawal(uuid, integer, text, text) TO service_role;
