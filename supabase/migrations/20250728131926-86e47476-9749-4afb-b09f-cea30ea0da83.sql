-- Fix security warnings by setting search_path for all functions

-- Update existing functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, country)
  VALUES (NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'country', '')
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.setup_admin_user(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update notification functions with proper search_path
CREATE OR REPLACE FUNCTION notify_admin_on_new_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first admin user
    SELECT user_id INTO admin_user_id 
    FROM public.user_roles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            inquiry_id
        ) VALUES (
            admin_user_id,
            'New Inquiry Submitted',
            'A new inquiry for "' || NEW.item_name || '" has been submitted and requires review.',
            'info',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_user_on_inquiry_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only notify if status changed to approved or dismissed
    IF (OLD.status != NEW.status AND NEW.status IN ('approved', 'dismissed')) THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            inquiry_id
        ) VALUES (
            NEW.user_id,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Inquiry Approved - Quote Available'
                ELSE 'Inquiry Status Updated'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Great news! Your inquiry for "' || NEW.item_name || '" has been approved. Check your dashboard for supplier quotes and pricing details.'
                ELSE 'Your inquiry for "' || NEW.item_name || '" has been ' || NEW.status || '.'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'success'
                WHEN NEW.status = 'dismissed' THEN 'warning'
                ELSE 'info'
            END,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;