-- Table to track page views for published apps
CREATE TABLE public.app_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  visitor_ip text,
  user_agent text,
  referrer text
);

-- Index for fast lookups by app
CREATE INDEX idx_app_views_app_id ON public.app_views (app_id);
CREATE INDEX idx_app_views_viewed_at ON public.app_views (viewed_at);

-- Enable RLS
ALTER TABLE public.app_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (anonymous visitors)
CREATE POLICY "Anyone can record a view"
ON public.app_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only app owners can read their own app views
CREATE POLICY "Owners can view analytics"
ON public.app_views FOR SELECT
TO authenticated
USING (is_app_owner(app_id));

-- Enable realtime for live analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_views;