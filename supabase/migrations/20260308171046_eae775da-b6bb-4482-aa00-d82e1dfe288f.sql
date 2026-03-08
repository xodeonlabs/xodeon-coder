-- Group chat types
CREATE TYPE public.chat_group_type AS ENUM ('friend_group', 'private', 'org_channel');

-- Chat groups table
CREATE TABLE public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '💬',
  type chat_group_type NOT NULL DEFAULT 'private',
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  chat_retention_hours integer NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

-- Chat group members
CREATE TABLE public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- Chat group messages
CREATE TABLE public.chat_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_group_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_messages;

-- Helper function: is user a member of group
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = _group_id AND user_id = auth.uid()
  );
$$;

-- Helper: is user group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE id = _group_id AND created_by = auth.uid()
  );
$$;

-- RLS for chat_groups
CREATE POLICY "Members can view their groups" ON public.chat_groups
  FOR SELECT TO authenticated
  USING (is_group_member(id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create groups" ON public.chat_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can update groups" ON public.chat_groups
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Creators can delete groups" ON public.chat_groups
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS for chat_group_members
CREATE POLICY "Members can view group members" ON public.chat_group_members
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

CREATE POLICY "Group creators can add members" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (is_group_creator(group_id) OR is_group_member(group_id));

CREATE POLICY "Group creators can remove members" ON public.chat_group_members
  FOR DELETE TO authenticated
  USING (is_group_creator(group_id) OR user_id = auth.uid());

-- RLS for chat_group_messages
CREATE POLICY "Members can view group messages" ON public.chat_group_messages
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

CREATE POLICY "Members can send messages" ON public.chat_group_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id) AND user_id = auth.uid());

CREATE POLICY "Admins can delete group messages" ON public.chat_group_messages
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));