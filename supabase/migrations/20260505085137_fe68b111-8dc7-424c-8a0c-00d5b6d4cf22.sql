
-- 1. Fix templates UPDATE policy: remove broad update, add RPC for downloads
DROP POLICY IF EXISTS "Anyone can increment downloads" ON public.templates;

CREATE OR REPLACE FUNCTION public.increment_template_downloads(template_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.templates
  SET downloads = downloads + 1
  WHERE id = template_id AND is_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_template_downloads(uuid) TO authenticated;

-- 2. Fix organizations join_code exposure via column-level privilege
REVOKE SELECT (join_code) ON public.organizations FROM anon, authenticated;
GRANT SELECT (join_code) ON public.organizations TO authenticator;

CREATE OR REPLACE FUNCTION public.get_org_join_code(org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT join_code FROM public.organizations
  WHERE id = org_id
    AND (owner_id = auth.uid() OR public.has_org_role(id, 'admin'::org_role));
$$;

GRANT EXECUTE ON FUNCTION public.get_org_join_code(uuid) TO authenticated;

-- 3. Restrict friendships public visibility to authenticated only
DROP POLICY IF EXISTS "Anyone can view accepted friendships" ON public.friendships;

CREATE POLICY "Authenticated can view accepted friendships"
ON public.friendships
FOR SELECT
TO authenticated
USING (status = 'accepted');

-- 4. Storage app-images: enforce path ownership on INSERT
DROP POLICY IF EXISTS "Users can upload app images" ON storage.objects;

CREATE POLICY "Users can upload own app images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
