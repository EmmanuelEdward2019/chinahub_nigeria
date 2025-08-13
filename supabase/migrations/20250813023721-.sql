-- Fix the specific pending transaction for Pius Emma and create a function to handle future stuck transactions
UPDATE public.transactions 
SET status = 'completed' 
WHERE reference = 'topup_68d739a9-eaf3-4c47-aa27-c5ae485f87cd_1755050788334' 
AND status = 'pending';

-- Process the wallet topup for Pius Emma's ₦1,000 transaction
UPDATE public.wallets 
SET naira_balance = naira_balance + 100000,
    updated_at = now()
WHERE user_id = '68d739a9-eaf3-4c47-aa27-c5ae485f87cd';

-- Create a function to automatically fix stuck pending transactions
CREATE OR REPLACE FUNCTION public.fix_stuck_pending_transactions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transaction_record record;
  total_fixed integer := 0;
  result json;
BEGIN
  -- Process all pending wallet_topup transactions older than 1 hour
  FOR transaction_record IN 
    SELECT * FROM transactions 
    WHERE transaction_type = 'wallet_topup' 
    AND status = 'pending'
    AND created_at < (now() - interval '1 hour')
  LOOP
    -- Update wallet balance
    IF transaction_record.currency = 'NGN' THEN
      UPDATE wallets 
      SET naira_balance = naira_balance + transaction_record.amount,
          updated_at = now()
      WHERE user_id = transaction_record.user_id;
    ELSE
      UPDATE wallets 
      SET dollar_balance = dollar_balance + transaction_record.amount,
          updated_at = now()
      WHERE user_id = transaction_record.user_id;
    END IF;
    
    -- Mark transaction as completed
    UPDATE transactions 
    SET status = 'completed'
    WHERE id = transaction_record.id;
    
    total_fixed := total_fixed + 1;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'transactions_fixed', total_fixed,
    'message', 'All stuck pending transactions have been processed'
  );
  
  RETURN result;
END;
$function$;