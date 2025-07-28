-- Fix the setup_admin_user function to work with the actual profiles table structure
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
        -- Ensure the user has a profile (only with columns that exist)
        INSERT INTO public.profiles (user_id, full_name, phone, country)
        VALUES (admin_user_id, 'System Administrator', '', 'Nigeria')
        ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name;
        
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

-- Now execute the function to grant admin privileges
SELECT setup_admin_user('techfieldstechnologies@gmail.com');