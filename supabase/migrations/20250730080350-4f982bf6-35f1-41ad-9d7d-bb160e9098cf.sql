-- Add multiple file support to inquiries table
ALTER TABLE public.inquiries 
ADD COLUMN sample_files JSONB DEFAULT '[]'::jsonb;

-- Create a global settings table for admin-configurable fees
CREATE TABLE public.inquiry_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_fee_naira INTEGER NOT NULL DEFAULT 100000, -- ₦1000 in kobo
  default_fee_dollar INTEGER NOT NULL DEFAULT 200,   -- $2 in cents
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on inquiry_settings
ALTER TABLE public.inquiry_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read inquiry settings
CREATE POLICY "inquiry_settings_select" ON public.inquiry_settings
  FOR SELECT
  USING (true);

-- Only admins can insert/update inquiry settings
CREATE POLICY "inquiry_settings_insert" ON public.inquiry_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "inquiry_settings_update" ON public.inquiry_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.inquiry_settings (default_fee_naira, default_fee_dollar)
VALUES (100000, 200);

-- Add trigger for updating updated_at
CREATE TRIGGER update_inquiry_settings_updated_at
  BEFORE UPDATE ON public.inquiry_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();