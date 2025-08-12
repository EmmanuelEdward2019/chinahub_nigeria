-- Fix inquiry settings to use correct fee amounts
-- Current: 100000 (₦100,000) 
-- Should be: 1000 (₦1,000)
UPDATE inquiry_settings 
SET default_fee_naira = 1000,
    updated_at = now()
WHERE default_fee_naira = 100000;

-- Also update any inquiry fee transactions that used the wrong amount
-- and refund the difference to user wallets
WITH wrong_fees AS (
  SELECT 
    t.user_id,
    t.amount,
    t.id as transaction_id,
    (t.amount - 1000) as refund_amount
  FROM transactions t
  WHERE t.transaction_type = 'inquiry_fee' 
    AND t.status = 'completed'
    AND t.amount = 100000
    AND t.created_at >= '2025-08-11'  -- Only recent wrong transactions
)
UPDATE wallets 
SET naira_balance = naira_balance + wrong_fees.refund_amount,
    updated_at = now()
FROM wrong_fees 
WHERE wallets.user_id = wrong_fees.user_id;

-- Update the transaction amounts to reflect correct fee
UPDATE transactions 
SET amount = 1000,
    reference = REPLACE(reference, '100000', '1000')
WHERE transaction_type = 'inquiry_fee' 
  AND status = 'completed'
  AND amount = 100000
  AND created_at >= '2025-08-11';