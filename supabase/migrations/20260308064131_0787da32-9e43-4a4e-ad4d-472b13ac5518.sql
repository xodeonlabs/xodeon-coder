
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  ngc_code text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Only app owners and collaborators can view versions
CREATE POLICY "Owners can view versions"
  ON public.app_versions FOR SELECT
  TO authenticated
  USING (is_app_owner(app_id) OR is_app_collaborator(app_id) OR is_app_org_member(app_id));

-- Only owners and collaborators can create versions
CREATE POLICY "Owners and collaborators can create versions"
  ON public.app_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_app_owner(app_id) OR is_app_collaborator(app_id) OR is_app_org_member(app_id))
    AND created_by = auth.uid()
  );

-- Only owners can delete versions
CREATE POLICY "Owners can delete versions"
  ON public.app_versions FOR DELETE
  TO authenticated
  USING (is_app_owner(app_id));

CREATE INDEX idx_app_versions_app_id ON public.app_versions(app_id, created_at DESC);
