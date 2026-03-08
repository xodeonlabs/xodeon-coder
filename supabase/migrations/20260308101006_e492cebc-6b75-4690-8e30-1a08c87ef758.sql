
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text DEFAULT NULL,
  details text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the log
CREATE POLICY "Admins can view activity log"
  ON public.admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert into the log
CREATE POLICY "Admins can insert activity log"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow service role (edge functions) to insert - handled by default since service role bypasses RLS
