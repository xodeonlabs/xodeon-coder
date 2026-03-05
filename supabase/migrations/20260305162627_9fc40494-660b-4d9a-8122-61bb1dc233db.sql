
-- Create org role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_join_code_unique UNIQUE (join_code)
);

-- Organization members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_members_unique UNIQUE (organization_id, user_id)
);

-- Helper function: check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
$$;

-- Helper function: check if user is org owner
CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND owner_id = auth.uid()
  );
$$;

-- Helper function: check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _role org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = _role
  );
$$;

-- RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (is_org_member(id));

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- RLS for organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org members"
ON public.organization_members FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "Owners and admins can add members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
  is_org_owner(organization_id) 
  OR has_org_role(organization_id, 'admin')
  OR user_id = auth.uid()
);

CREATE POLICY "Owners can update member roles"
ON public.organization_members FOR UPDATE
TO authenticated
USING (is_org_owner(organization_id));

CREATE POLICY "Owners can remove members"
ON public.organization_members FOR DELETE
TO authenticated
USING (is_org_owner(organization_id) OR user_id = auth.uid());

-- Trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to join org by code (security definer to read org without RLS)
CREATE OR REPLACE FUNCTION public.join_organization_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  SELECT id INTO _org_id FROM public.organizations WHERE join_code = _code;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Ongeldige bedrijfscode';
  END IF;
  
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'member')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  RETURN _org_id;
END;
$$;
