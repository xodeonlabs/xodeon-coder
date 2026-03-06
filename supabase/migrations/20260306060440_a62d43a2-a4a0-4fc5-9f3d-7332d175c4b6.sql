
-- Add organization_id column to apps table
ALTER TABLE public.apps ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL DEFAULT NULL;

-- Create helper function to check if user is member of the app's org
CREATE OR REPLACE FUNCTION public.is_app_org_member(_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apps a
    JOIN public.organization_members om ON om.organization_id = a.organization_id
    WHERE a.id = _app_id AND om.user_id = auth.uid() AND a.organization_id IS NOT NULL
  );
$$;

-- Update the SELECT policy to include org members
DROP POLICY IF EXISTS "Users can view own, collab, public, or remixable apps" ON public.apps;
CREATE POLICY "Users can view own, collab, public, or remixable apps"
ON public.apps FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_app_collaborator(id)
  OR is_app_org_member(id)
  OR is_public = true
  OR is_remixable = true
);

-- Allow org members to update org apps
DROP POLICY IF EXISTS "Owners and collaborators can update apps" ON public.apps;
CREATE POLICY "Owners and collaborators can update apps"
ON public.apps FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_app_collaborator(id)
  OR is_app_org_member(id)
);
