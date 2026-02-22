
-- Apps table
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled App',
  ngc_code TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_remixable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collaborators table
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(app_id, user_id)
);

-- Enable RLS
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_app_owner(_app_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apps WHERE id = _app_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_collaborator(_app_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_collaborators WHERE app_id = _app_id AND user_id = auth.uid()
  );
$$;

-- RLS for apps
CREATE POLICY "Users can view own, collab, public, or remixable apps"
  ON public.apps FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_app_collaborator(id)
    OR is_public = true
    OR is_remixable = true
  );

CREATE POLICY "Users can create their own apps"
  ON public.apps FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and collaborators can update apps"
  ON public.apps FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_app_collaborator(id));

CREATE POLICY "Only owners can delete apps"
  ON public.apps FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS for collaborators
CREATE POLICY "Owners can view collaborators"
  ON public.project_collaborators FOR SELECT TO authenticated
  USING (public.is_app_owner(app_id));

CREATE POLICY "Owners can add collaborators"
  ON public.project_collaborators FOR INSERT TO authenticated
  WITH CHECK (
    public.is_app_owner(app_id)
    AND user_id != auth.uid()
    AND invited_by = auth.uid()
  );

CREATE POLICY "Owners can remove collaborators"
  ON public.project_collaborators FOR DELETE TO authenticated
  USING (public.is_app_owner(app_id));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
