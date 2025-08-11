-- Create function to deduct wallet balance for inquiry submissions
CREATE OR REPLACE FUNCTION public.deduct_inquiry_fee(
  p_user_id uuid,
  p_amount integer,
  p_currency text,
  p_inquiry_id uuid
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
  -- Get current balance and check if sufficient
  IF p_currency = 'NGN' THEN
    SELECT naira_balance INTO current_balance 
    FROM wallets WHERE user_id = p_user_id;
    
    IF current_balance < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    new_balance := current_balance - p_amount;
    
    UPDATE wallets 
    SET naira_balance = new_balance, updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    SELECT dollar_balance INTO current_balance 
    FROM wallets WHERE user_id = p_user_id;
    
    IF current_balance < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    new_balance := current_balance - p_amount;
    
    UPDATE wallets 
    SET dollar_balance = new_balance, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Create transaction record
  INSERT INTO transactions (
    user_id,
    inquiry_id,
    transaction_type,
    amount,
    currency,
    status,
    reference
  ) VALUES (
    p_user_id,
    p_inquiry_id,
    'inquiry_fee',
    p_amount,
    p_currency,
    'completed',
    'INQ-' || p_inquiry_id::text
  );

  result := json_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'amount_deducted', p_amount
  );

  RETURN result;
END;
$$;