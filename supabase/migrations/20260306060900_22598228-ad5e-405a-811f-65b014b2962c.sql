
-- Fix: recreate organizations INSERT policy as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Also fix organization_members INSERT policy
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.organization_members;
CREATE POLICY "Owners and admins can add members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
  is_org_owner(organization_id)
  OR has_org_role(organization_id, 'admin'::org_role)
  OR (user_id = auth.uid())
);
