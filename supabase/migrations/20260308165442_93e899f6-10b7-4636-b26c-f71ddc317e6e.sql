
-- Friend messages table
CREATE TABLE public.friend_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Index for fast lookups
CREATE INDEX idx_friend_messages_participants ON public.friend_messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_friend_messages_receiver ON public.friend_messages (receiver_id, created_at DESC);

-- Security definer function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user1 uuid, _user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (sender_id = _user1 AND receiver_id = _user2)
        OR (sender_id = _user2 AND receiver_id = _user1)
      )
  );
$$;

-- RLS
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or receiver AND they are friends
CREATE POLICY "Users can view own friend messages"
  ON public.friend_messages FOR SELECT TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND are_friends(sender_id, receiver_id)
  );

-- Users can send messages only to friends
CREATE POLICY "Users can send messages to friends"
  ON public.friend_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND are_friends(auth.uid(), receiver_id)
  );

-- Users can delete own messages
CREATE POLICY "Users can delete own messages"
  ON public.friend_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_messages;
