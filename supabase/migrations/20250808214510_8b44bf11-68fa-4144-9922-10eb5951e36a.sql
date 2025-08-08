-- First, let's drop the problematic foreign key constraints
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS fk_inquiries_user_id;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_user_id;

-- Create proper queries by ensuring we can join properly
-- The issue is that we're trying to use a foreign key reference that doesn't work as expected
-- Let's make sure all tables that reference user_id actually link to auth.users properly

-- Update RLS policies to ensure admin can see everything
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.inquiries;
CREATE POLICY "Admins can view all inquiries" 
ON public.inquiries 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));