-- Create function to deduct wallet balance
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  user_id UUID,
  amount INTEGER,
  currency TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF currency = 'naira' THEN
    UPDATE public.wallets
    SET naira_balance = naira_balance - amount,
        updated_at = now()
    WHERE wallets.user_id = deduct_wallet_balance.user_id;
  ELSIF currency = 'dollar' THEN
    UPDATE public.wallets
    SET dollar_balance = dollar_balance - amount,
        updated_at = now()
    WHERE wallets.user_id = deduct_wallet_balance.user_id;
  END IF;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;
END;
$$;