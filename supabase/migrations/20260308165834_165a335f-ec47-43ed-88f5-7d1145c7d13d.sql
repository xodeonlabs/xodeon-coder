-- Allow users to update read_at on messages sent to them
CREATE POLICY "Users can update read_at on received messages"
  ON public.friend_messages FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());