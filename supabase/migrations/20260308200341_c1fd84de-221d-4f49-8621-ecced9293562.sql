-- Re-create the ad limit trigger (was lost when function was replaced)
CREATE OR REPLACE TRIGGER enforce_org_ad_limit
BEFORE INSERT OR UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.check_org_ad_limit();

-- Enable realtime for user_coins so sidebar updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coins;