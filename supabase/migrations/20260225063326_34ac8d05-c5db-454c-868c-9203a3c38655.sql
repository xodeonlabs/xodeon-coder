-- Chat messages for collaborative apps
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages if they own the app or are a collaborator
CREATE POLICY "Users can read chat messages"
ON public.chat_messages FOR SELECT
USING (
  is_app_owner(app_id) OR is_app_collaborator(app_id)
);

-- Users can send messages if they own the app or are a collaborator
CREATE POLICY "Users can send chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (is_app_owner(app_id) OR is_app_collaborator(app_id))
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Index for fast queries
CREATE INDEX idx_chat_messages_app_id ON public.chat_messages(app_id, created_at);
