
ALTER TABLE public.ads ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT NULL;

CREATE POLICY "Org admins can insert own ad"
ON public.ads FOR INSERT TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND (has_org_role(organization_id, 'owner') OR has_org_role(organization_id, 'admin'))
);

CREATE POLICY "Org admins can update own ad"
ON public.ads FOR UPDATE TO authenticated
USING (
  organization_id IS NOT NULL
  AND (has_org_role(organization_id, 'owner') OR has_org_role(organization_id, 'admin'))
);

CREATE POLICY "Org admins can delete own ad"
ON public.ads FOR DELETE TO authenticated
USING (
  organization_id IS NOT NULL
  AND (has_org_role(organization_id, 'owner') OR has_org_role(organization_id, 'admin'))
);

CREATE OR REPLACE FUNCTION public.check_org_ad_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.ads WHERE organization_id = NEW.organization_id AND id != NEW.id) THEN
      RAISE EXCEPTION 'Een bedrijf mag maximaal 1 advertentie hebben';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_org_ad_limit
BEFORE INSERT OR UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.check_org_ad_limit();
