
-- Drop old admin-only policies on alliances
DROP POLICY IF EXISTS "Admins can create alliances" ON public.alliances;
DROP POLICY IF EXISTS "Admins can delete alliances" ON public.alliances;
DROP POLICY IF EXISTS "Admins can update alliances" ON public.alliances;

-- Allow any authenticated user who owns an org to create alliances
CREATE POLICY "Org owners can create alliances" ON public.alliances
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- Creators can update their own alliances
CREATE POLICY "Creators can update alliances" ON public.alliances
  FOR UPDATE USING (created_by = auth.uid());

-- Creators can delete their own alliances
CREATE POLICY "Creators can delete alliances" ON public.alliances
  FOR DELETE USING (created_by = auth.uid());

-- Allow all authenticated users to view alliances (so they show up)
DROP POLICY IF EXISTS "Alliance members can view" ON public.alliances;
CREATE POLICY "Authenticated can view alliances" ON public.alliances
  FOR SELECT TO authenticated USING (true);

-- Drop old admin-only policies on alliance_members
DROP POLICY IF EXISTS "Admins can add alliance members" ON public.alliance_members;
DROP POLICY IF EXISTS "Admins can remove alliance members" ON public.alliance_members;
DROP POLICY IF EXISTS "Alliance members can view members" ON public.alliance_members;

-- Alliance creator or org owners/admins in the alliance can add members
CREATE POLICY "Alliance creators can add members" ON public.alliance_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.alliances WHERE id = alliance_id AND created_by = auth.uid())
    OR is_alliance_admin(alliance_id)
  );

-- Alliance creators can remove members
CREATE POLICY "Alliance creators can remove members" ON public.alliance_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.alliances WHERE id = alliance_id AND created_by = auth.uid())
    OR is_alliance_admin(alliance_id)
  );

-- All authenticated users can view alliance members
CREATE POLICY "Authenticated can view alliance members" ON public.alliance_members
  FOR SELECT TO authenticated USING (true);

-- Drop old admin-only insert on alliance_coins, allow creator
DROP POLICY IF EXISTS "Admins can insert alliance coins" ON public.alliance_coins;
CREATE POLICY "Alliance creators can insert coins" ON public.alliance_coins
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.alliances WHERE id = alliance_id AND created_by = auth.uid())
  );

-- Allow all authenticated to view alliance coins
DROP POLICY IF EXISTS "Alliance members can view coins" ON public.alliance_coins;
CREATE POLICY "Authenticated can view alliance coins" ON public.alliance_coins
  FOR SELECT TO authenticated USING (true);
