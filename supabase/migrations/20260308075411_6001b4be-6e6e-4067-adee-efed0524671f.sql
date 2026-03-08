
-- Organization coin vault
CREATE TABLE public.org_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'coins',
  balance bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.org_coins ENABLE ROW LEVEL SECURITY;

-- Members can view their org's coins
CREATE POLICY "Org members can view coins"
  ON public.org_coins FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id));

-- Owners and admins can insert coins
CREATE POLICY "Org owners/admins can insert coins"
  ON public.org_coins FOR INSERT
  TO authenticated
  WITH CHECK (is_org_member(organization_id));

-- Owners and admins can update coins
CREATE POLICY "Org owners/admins can update coins"
  ON public.org_coins FOR UPDATE
  TO authenticated
  USING (is_org_member(organization_id));

-- Coin transaction log
CREATE TABLE public.org_coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coin_name text NOT NULL DEFAULT 'coins',
  amount bigint NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  user_id uuid NOT NULL,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view transactions"
  ON public.org_coin_transactions FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Org members can insert transactions"
  ON public.org_coin_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_org_member(organization_id) AND user_id = auth.uid());
