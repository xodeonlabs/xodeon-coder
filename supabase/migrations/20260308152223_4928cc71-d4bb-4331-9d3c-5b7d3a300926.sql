
CREATE TABLE public.org_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON public.org_join_requests
  FOR SELECT USING (user_id = auth.uid());

-- Org owners/admins can view requests for their org
CREATE POLICY "Org admins can view requests" ON public.org_join_requests
  FOR SELECT USING (has_org_role(organization_id, 'owner'::org_role) OR has_org_role(organization_id, 'admin'::org_role));

-- Authenticated users can create requests
CREATE POLICY "Users can create requests" ON public.org_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Org owners/admins can update requests (accept/reject)
CREATE POLICY "Org admins can update requests" ON public.org_join_requests
  FOR UPDATE USING (has_org_role(organization_id, 'owner'::org_role) OR has_org_role(organization_id, 'admin'::org_role));

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own pending requests" ON public.org_join_requests
  FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- Org admins can delete requests
CREATE POLICY "Org admins can delete requests" ON public.org_join_requests
  FOR DELETE USING (has_org_role(organization_id, 'owner'::org_role) OR has_org_role(organization_id, 'admin'::org_role));
