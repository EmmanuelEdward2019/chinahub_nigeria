-- Create orders table for inquiry payments
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'wallet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add payment_status column to inquiries table
ALTER TABLE public.inquiries ADD COLUMN payment_status TEXT DEFAULT 'unpaid';

-- Create notification replies table
CREATE TABLE public.notification_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_replies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view replies to their notifications" ON public.notification_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.id = notification_id AND n.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can create replies to their notifications" ON public.notification_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.id = notification_id AND n.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can create replies" ON public.notification_replies
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));