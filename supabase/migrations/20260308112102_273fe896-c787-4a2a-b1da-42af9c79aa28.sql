
CREATE TABLE public.user_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance bigint NOT NULL DEFAULT 100,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

-- Users can view their own coins
CREATE POLICY "Users can view own coins"
ON public.user_coins FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can update own coins (for in-app transactions)
CREATE POLICY "Users can update own coins"
ON public.user_coins FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Users can insert own coins row
CREATE POLICY "Users can insert own coins"
ON public.user_coins FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can view all coins
CREATE POLICY "Admins can view all coins"
ON public.user_coins FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all coins
CREATE POLICY "Admins can update all coins"
ON public.user_coins FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert coins for anyone
CREATE POLICY "Admins can insert coins for anyone"
ON public.user_coins FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Auto-create coins row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_coins
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_coins();
