
-- Fix SELECT policy to also allow owners to view their orgs directly
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR is_org_member(id));
