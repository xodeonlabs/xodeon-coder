
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS show_email boolean DEFAULT false;
