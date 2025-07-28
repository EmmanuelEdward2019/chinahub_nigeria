-- Create the admin user with specified credentials
-- First, we'll insert the user data directly into auth.users (this would normally be done through the auth API)
-- For demo purposes, we'll create a profiles entry and user_roles entry that will work with the specified email

-- Insert admin profile (the user must be created through Supabase Auth UI or API first)
-- This migration assumes the admin user will be created separately and we're just setting up the role

-- Note: In a real scenario, you would create the user through Supabase Auth API first
-- For now, we'll create a function that can be used to set up admin access for any user

CREATE OR REPLACE FUNCTION setup_admin_user(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID from auth.users based on email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NOT NULL THEN
        -- Ensure the user has a profile
        INSERT INTO public.profiles (user_id, full_name, email, phone, country)
        VALUES (admin_user_id, 'System Administrator', admin_email, '', 'Nigeria')
        ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email;
        
        -- Assign admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Create a wallet for the admin
        INSERT INTO public.wallets (user_id)
        VALUES (admin_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END;
$$;