
CREATE TABLE public.chat_group_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.chat_group_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view read status of their groups"
ON public.chat_group_read_status FOR SELECT TO authenticated
USING (is_group_member(group_id));

CREATE POLICY "Users can upsert own read status"
ON public.chat_group_read_status FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND is_group_member(group_id));

CREATE POLICY "Users can update own read status"
ON public.chat_group_read_status FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
