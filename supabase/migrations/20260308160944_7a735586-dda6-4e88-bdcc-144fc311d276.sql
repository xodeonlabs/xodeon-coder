
-- Drop existing insert policy and replace with one that allows all alliance members
DROP POLICY IF EXISTS "Alliance creators can add members" ON public.alliance_members;

CREATE POLICY "Alliance members can add members"
ON public.alliance_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_alliance_member(alliance_id) OR
  (EXISTS (SELECT 1 FROM alliances WHERE id = alliance_members.alliance_id AND created_by = auth.uid()))
);
