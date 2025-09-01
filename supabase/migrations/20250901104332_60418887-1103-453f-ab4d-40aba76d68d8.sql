-- Add dynamic pricing fields to inquiries table for admin feedback
ALTER TABLE public.inquiries 
ADD COLUMN unit_price integer,
ADD COLUMN processing_fee integer,
ADD COLUMN admin_pricing_currency text DEFAULT 'NGN';

-- Create edge function transactions table to track order payments separately from inquiry fees
-- Add payment_method field to track different payment types
ALTER TABLE public.transactions 
ADD COLUMN payment_method text DEFAULT 'wallet';