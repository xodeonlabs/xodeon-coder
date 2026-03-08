DROP TRIGGER IF EXISTS enforce_org_ad_limit ON public.ads;

CREATE TRIGGER enforce_org_ad_limit
BEFORE INSERT ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.check_org_ad_limit();