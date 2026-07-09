
CREATE TABLE public.site_customizations (
  mode text PRIMARY KEY CHECK (mode IN ('default','developer','gamer')),
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  word_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.site_customizations TO anon, authenticated;
GRANT ALL ON public.site_customizations TO service_role;

ALTER TABLE public.site_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site customizations"
  ON public.site_customizations FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site customizations"
  ON public.site_customizations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update site customizations"
  ON public.site_customizations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete site customizations"
  ON public.site_customizations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.site_customizations (mode, colors, word_overrides) VALUES
  ('default','{}','{}'),
  ('developer','{}','{}'),
  ('gamer','{}','{}');

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_customizations;
