-- Create a function to handle wallet topup that bypasses RLS
CREATE OR REPLACE FUNCTION public.process_wallet_topup(
  p_user_id uuid,
  p_amount integer,
  p_currency text,
  p_reference text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  current_balance integer;
  new_balance integer;
BEGIN
  -- Get current balance
  IF p_currency = 'NGN' THEN
    SELECT naira_balance INTO current_balance 
    FROM wallets WHERE user_id = p_user_id;
    
    new_balance := current_balance + p_amount;
    
    UPDATE wallets 
    SET naira_balance = new_balance, updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    SELECT dollar_balance INTO current_balance 
    FROM wallets WHERE user_id = p_user_id;
    
    new_balance := current_balance + p_amount;
    
    UPDATE wallets 
    SET dollar_balance = new_balance, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Update transaction status
  UPDATE transactions 
  SET status = 'completed'
  WHERE reference = p_reference;

  result := json_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'amount_added', p_amount
  );

  RETURN result;
END;
$$;