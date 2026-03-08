
CREATE TABLE public.pinned_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, app_id)
);

ALTER TABLE public.pinned_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pins"
  ON public.pinned_apps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pins"
  ON public.pinned_apps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pins"
  ON public.pinned_apps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
