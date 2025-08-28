-- Create order_stages table to track order progression
CREATE TABLE public.order_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  user_id UUID NOT NULL,
  admin_id UUID,
  stage TEXT NOT NULL DEFAULT 'pending_user_confirmation', -- pending_user_confirmation, awaiting_admin_quote, pending_payment, payment_completed, order_delivered, completed
  product_images JSONB DEFAULT '[]'::jsonb,
  confirmed_quantity INTEGER,
  quoted_amount INTEGER,
  quoted_currency TEXT DEFAULT 'NGN',
  admin_notes TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_stages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own order stages" 
ON public.order_stages 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own order stages" 
ON public.order_stages 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own order stages" 
ON public.order_stages 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all order stages" 
ON public.order_stages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_order_stages_updated_at
  BEFORE UPDATE ON public.order_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add order_stage_id to inquiries table to link them
ALTER TABLE public.inquiries ADD COLUMN order_stage_id UUID REFERENCES public.order_stages(id);

-- Create function to notify admin of new order confirmation
CREATE OR REPLACE FUNCTION public.notify_admin_on_order_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    admin_user_id UUID;
    inquiry_record RECORD;
BEGIN
    -- Get inquiry details
    SELECT item_name INTO inquiry_record FROM public.inquiries WHERE id = NEW.inquiry_id;
    
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
            'New Order Confirmation',
            'User has confirmed order for "' || inquiry_record.item_name || '" and is awaiting your quote.',
            'info',
            NEW.inquiry_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for order confirmation notifications
CREATE TRIGGER notify_admin_on_order_confirmation
  AFTER INSERT ON public.order_stages
  FOR EACH ROW
  WHEN (NEW.stage = 'awaiting_admin_quote')
  EXECUTE FUNCTION public.notify_admin_on_order_confirmation();

-- Create function to notify user of payment confirmation
CREATE OR REPLACE FUNCTION public.notify_user_on_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    inquiry_record RECORD;
BEGIN
    -- Get inquiry details
    SELECT item_name INTO inquiry_record FROM public.inquiries WHERE id = NEW.inquiry_id;
    
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        inquiry_id
    ) VALUES (
        NEW.user_id,
        'Payment Successful - Order Confirmed',
        'Your payment has been processed successfully for "' || inquiry_record.item_name || '". The admin will provide updates on your order progress.',
        'success',
        NEW.inquiry_id
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for payment success notifications
CREATE TRIGGER notify_user_on_payment_success
  AFTER UPDATE ON public.order_stages
  FOR EACH ROW
  WHEN (OLD.payment_status != 'paid' AND NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.notify_user_on_payment_success();

-- Create function to notify user of order delivery
CREATE OR REPLACE FUNCTION public.notify_user_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    inquiry_record RECORD;
BEGIN
    -- Get inquiry details
    SELECT item_name INTO inquiry_record FROM public.inquiries WHERE id = NEW.inquiry_id;
    
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        inquiry_id
    ) VALUES (
        NEW.user_id,
        'Order Delivered Successfully',
        'Great news! Your order for "' || inquiry_record.item_name || '" has been delivered successfully. Thank you for using ChinaHub!',
        'success',
        NEW.inquiry_id
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for delivery notifications
CREATE TRIGGER notify_user_on_delivery
  AFTER UPDATE ON public.order_stages
  FOR EACH ROW
  WHEN (OLD.stage != 'order_delivered' AND NEW.stage = 'order_delivered')
  EXECUTE FUNCTION public.notify_user_on_delivery();