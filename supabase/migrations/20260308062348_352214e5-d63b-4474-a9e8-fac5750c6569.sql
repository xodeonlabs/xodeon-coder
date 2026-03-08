-- Add slug column to apps table
ALTER TABLE public.apps ADD COLUMN slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_apps_slug ON public.apps (slug) WHERE slug IS NOT NULL;

-- Allow anonymous users to view public apps by slug
CREATE POLICY "Anyone can view public apps"
ON public.apps FOR SELECT
TO anon
USING (is_public = true);