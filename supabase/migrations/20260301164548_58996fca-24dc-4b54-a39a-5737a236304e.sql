CREATE OR REPLACE FUNCTION public.is_own_app(_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apps WHERE id = _app_id AND owner_id = auth.uid()
  );
$$;