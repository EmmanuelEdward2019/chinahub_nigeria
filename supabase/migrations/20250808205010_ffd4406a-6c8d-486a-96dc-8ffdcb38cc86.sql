-- Add new columns to track quote confirmation workflow
ALTER TABLE public.inquiries 
ADD COLUMN quote_confirmed_at timestamp with time zone,
ADD COLUMN quote_payment_processed boolean DEFAULT false;

-- Update existing inquiries to reflect new workflow  
-- Mark paid inquiries as quote confirmed since they already paid
UPDATE public.inquiries 
SET quote_confirmed_at = created_at,
    quote_payment_processed = true 
WHERE payment_status = 'paid';