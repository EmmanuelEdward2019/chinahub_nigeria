-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment plans table
CREATE TABLE public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  naira_price INTEGER NOT NULL DEFAULT 100000, -- N1000 in kobo
  dollar_price INTEGER NOT NULL DEFAULT 200, -- $2 in cents
  weight_range TEXT,
  size_range TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  naira_balance INTEGER NOT NULL DEFAULT 0, -- Balance in kobo
  dollar_balance INTEGER NOT NULL DEFAULT 0, -- Balance in cents
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inquiries table
CREATE TABLE public.inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  sample_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, approved, dismissed
  admin_feedback TEXT,
  supplier_quote TEXT,
  processing_fee_naira INTEGER,
  processing_fee_dollar INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES public.inquiries(id),
  transaction_type TEXT NOT NULL, -- topup, deduction, refund
  currency TEXT NOT NULL, -- NGN, USD
  amount INTEGER NOT NULL, -- Amount in kobo/cents
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for categories (public read)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

-- Create policies for payment plans (public read)
CREATE POLICY "Payment plans are viewable by everyone" ON public.payment_plans
  FOR SELECT USING (true);

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallet" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for inquiries
CREATE POLICY "Users can view their own inquiries" ON public.inquiries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own inquiries" ON public.inquiries
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'));
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories
INSERT INTO public.categories (name, icon) VALUES
  ('Furniture', 'sofa'),
  ('Electricals', 'zap'),
  ('Kitchen Equipment', 'chef-hat'),
  ('Steel Materials', 'hammer'),
  ('Phones', 'smartphone'),
  ('Computers', 'laptop'),
  ('Electronics', 'cpu'),
  ('Others', 'package');

-- Insert default payment plan
INSERT INTO public.payment_plans (name, naira_price, dollar_price, is_default) VALUES
  ('Standard', 100000, 200, true);

-- Create storage bucket for sample uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('samples', 'samples', false);

-- Create storage policies
CREATE POLICY "Users can upload their own samples" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own samples" ON storage.objects
  FOR SELECT USING (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own samples" ON storage.objects
  FOR UPDATE USING (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own samples" ON storage.objects
  FOR DELETE USING (bucket_id = 'samples' AND auth.uid()::text = (storage.foldername(name))[1]);