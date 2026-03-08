-- Tighten the insert policy: only allow views for public apps
DROP POLICY "Anyone can record a view" ON public.app_views;

CREATE POLICY "Anyone can record a view for public apps"
ON public.app_views FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND is_public = true)
);