-- Allow service role to delete old org chat messages (RLS bypassed by service role, but add policy for completeness)
CREATE POLICY "Admins can delete org chat messages"
  ON public.org_chat_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete alliance chat messages"
  ON public.alliance_chat_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));