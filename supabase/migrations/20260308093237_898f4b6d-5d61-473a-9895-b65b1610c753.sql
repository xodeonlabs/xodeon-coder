
CREATE TABLE public.org_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read org chat" ON public.org_chat_messages
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Org members can send org chat" ON public.org_chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_org_member(organization_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.org_chat_messages;
