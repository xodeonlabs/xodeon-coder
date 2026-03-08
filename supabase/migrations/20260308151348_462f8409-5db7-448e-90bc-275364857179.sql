
-- Alliances table
CREATE TABLE public.alliances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🤝',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.alliances ENABLE ROW LEVEL SECURITY;

-- Alliance members (which orgs are in an alliance)
CREATE TABLE public.alliance_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alliance_id UUID NOT NULL REFERENCES public.alliances(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(alliance_id, organization_id)
);

ALTER TABLE public.alliance_members ENABLE ROW LEVEL SECURITY;

-- Alliance chat messages
CREATE TABLE public.alliance_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alliance_id UUID NOT NULL REFERENCES public.alliances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alliance_chat_messages ENABLE ROW LEVEL SECURITY;

-- Shared alliance coin pool
CREATE TABLE public.alliance_coins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alliance_id UUID NOT NULL REFERENCES public.alliances(id) ON DELETE CASCADE UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alliance_coins ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of any org in alliance
CREATE OR REPLACE FUNCTION public.is_alliance_member(_alliance_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.alliance_members am
    JOIN public.organization_members om ON om.organization_id = am.organization_id
    WHERE am.alliance_id = _alliance_id AND om.user_id = auth.uid()
  );
$$;

-- Helper: check if user is admin/owner of any org in alliance
CREATE OR REPLACE FUNCTION public.is_alliance_admin(_alliance_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.alliance_members am
    JOIN public.organization_members om ON om.organization_id = am.organization_id
    WHERE am.alliance_id = _alliance_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  );
$$;

-- RLS Policies for alliances
CREATE POLICY "Alliance members can view" ON public.alliances
  FOR SELECT USING (is_alliance_member(id));

CREATE POLICY "Admins can create alliances" ON public.alliances
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alliances" ON public.alliances
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete alliances" ON public.alliances
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for alliance_members
CREATE POLICY "Alliance members can view members" ON public.alliance_members
  FOR SELECT USING (is_alliance_member(alliance_id));

CREATE POLICY "Admins can add alliance members" ON public.alliance_members
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can remove alliance members" ON public.alliance_members
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for alliance_chat_messages
CREATE POLICY "Alliance members can view chat" ON public.alliance_chat_messages
  FOR SELECT USING (is_alliance_member(alliance_id));

CREATE POLICY "Alliance members can send chat" ON public.alliance_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_alliance_member(alliance_id) AND user_id = auth.uid());

-- RLS for alliance_coins
CREATE POLICY "Alliance members can view coins" ON public.alliance_coins
  FOR SELECT USING (is_alliance_member(alliance_id));

CREATE POLICY "Alliance admins can update coins" ON public.alliance_coins
  FOR UPDATE TO authenticated
  USING (is_alliance_admin(alliance_id));

CREATE POLICY "Admins can insert alliance coins" ON public.alliance_coins
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for alliance chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.alliance_chat_messages;
