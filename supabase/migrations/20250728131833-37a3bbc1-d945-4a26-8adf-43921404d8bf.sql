-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications; 
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can insert notifications for users
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add wallet transaction policy for admins
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert transactions
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;
CREATE POLICY "Admins can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update admins inquiry policy to allow updates
DROP POLICY IF EXISTS "Admins can update inquiries" ON public.inquiries;
CREATE POLICY "Admins can update inquiries" ON public.inquiries
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for payment plans management
DROP POLICY IF EXISTS "Admins can manage payment plans" ON public.payment_plans;
CREATE POLICY "Admins can manage payment plans" ON public.payment_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to automatically notify admin on new inquiry
CREATE OR REPLACE FUNCTION notify_admin_on_new_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for new inquiry notifications
DROP TRIGGER IF EXISTS notify_admin_on_inquiry ON public.inquiries;
CREATE TRIGGER notify_admin_on_inquiry
    AFTER INSERT ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_new_inquiry();

-- Function to create user notification when inquiry is processed
CREATE OR REPLACE FUNCTION notify_user_on_inquiry_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for inquiry status updates
DROP TRIGGER IF EXISTS notify_user_on_inquiry_update ON public.inquiries;
CREATE TRIGGER notify_user_on_inquiry_update
    AFTER UPDATE ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_on_inquiry_update();