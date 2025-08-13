-- Update inquiry_settings to enforce correct minimum amounts
UPDATE public.inquiry_settings 
SET 
  default_fee_naira = 100000,  -- ₦1,000 in kobo
  default_fee_dollar = 200,    -- $2 in cents
  updated_at = now()
WHERE id IS NOT NULL;

-- If no settings exist, insert the correct values
INSERT INTO public.inquiry_settings (default_fee_naira, default_fee_dollar)
SELECT 100000, 200
WHERE NOT EXISTS (SELECT 1 FROM public.inquiry_settings);

-- Fix any incorrect inquiry_fee transactions (update amounts that are clearly wrong)
UPDATE public.transactions 
SET amount = CASE 
  WHEN currency = 'NGN' THEN 100000  -- ₦1,000 in kobo
  WHEN currency = 'USD' THEN 200     -- $2 in cents
END
WHERE transaction_type = 'inquiry_fee' 
AND (
  (currency = 'NGN' AND amount != 100000) OR 
  (currency = 'USD' AND amount != 200)
);