
CREATE TABLE public.org_chat_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.org_chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status" ON public.org_chat_read_status
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own read status" ON public.org_chat_read_status
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_org_member(organization_id));

CREATE POLICY "Users can update own read status" ON public.org_chat_read_status
  FOR UPDATE USING (user_id = auth.uid());
