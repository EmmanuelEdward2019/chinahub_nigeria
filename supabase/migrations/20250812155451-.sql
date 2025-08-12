-- Create a function to recalculate and fix all wallet balances based on actual successful transactions
CREATE OR REPLACE FUNCTION public.fix_all_wallet_balances()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wallet_record record;
  calculated_naira_balance integer;
  calculated_dollar_balance integer;
  total_fixed integer := 0;
  result json;
BEGIN
  -- Loop through all wallets
  FOR wallet_record IN 
    SELECT user_id, naira_balance, dollar_balance FROM wallets
  LOOP
    -- Calculate actual balance from successful transactions
    SELECT 
      COALESCE(SUM(CASE 
        WHEN transaction_type = 'wallet_topup' AND currency = 'NGN' THEN amount
        WHEN transaction_type = 'inquiry_fee' AND currency = 'NGN' THEN -amount
        ELSE 0 
      END), 0),
      COALESCE(SUM(CASE 
        WHEN transaction_type = 'wallet_topup' AND currency = 'USD' THEN amount
        WHEN transaction_type = 'inquiry_fee' AND currency = 'USD' THEN -amount
        ELSE 0 
      END), 0)
    INTO calculated_naira_balance, calculated_dollar_balance
    FROM transactions 
    WHERE user_id = wallet_record.user_id 
    AND status = 'completed';
    
    -- Update wallet if balances don't match
    IF wallet_record.naira_balance != calculated_naira_balance OR 
       wallet_record.dollar_balance != calculated_dollar_balance THEN
      
      UPDATE wallets 
      SET 
        naira_balance = calculated_naira_balance,
        dollar_balance = calculated_dollar_balance,
        updated_at = now()
      WHERE user_id = wallet_record.user_id;
      
      total_fixed := total_fixed + 1;
    END IF;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'wallets_fixed', total_fixed,
    'message', 'All wallet balances have been recalculated based on actual successful transactions'
  );
  
  RETURN result;
END;
$function$;

-- Execute the function to fix all wallet balances
SELECT public.fix_all_wallet_balances();