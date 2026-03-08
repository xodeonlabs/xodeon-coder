
-- Only owners/admins can update (withdraw from) org_coins
DROP POLICY IF EXISTS "Org owners/admins can update coins" ON public.org_coins;
CREATE POLICY "Only admins can update org coins"
  ON public.org_coins FOR UPDATE
  TO authenticated
  USING (
    has_org_role(organization_id, 'owner'::org_role) OR 
    has_org_role(organization_id, 'admin'::org_role)
  );
