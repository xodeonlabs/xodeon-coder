
-- Allow authenticated users to view basic organization info for join requests
CREATE POLICY "Authenticated users can browse organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (true);
