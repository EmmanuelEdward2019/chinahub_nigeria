-- Add foreign key relationship between inquiries and profiles
ALTER TABLE public.inquiries 
ADD CONSTRAINT fk_inquiries_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key relationship to link inquiries with profiles
-- Since profiles.user_id already references auth.users(id), this creates the relationship
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;