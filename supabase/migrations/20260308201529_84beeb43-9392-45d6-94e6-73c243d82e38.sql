CREATE OR REPLACE FUNCTION public.check_org_ad_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _level integer;
  _max_ads integer;
  _current_count integer;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    SELECT COALESCE(level, 1) INTO _level FROM public.organizations WHERE id = NEW.organization_id;
    
    _max_ads := CASE _level
      WHEN 1 THEN 1
      WHEN 2 THEN 2
      WHEN 3 THEN 3
      WHEN 4 THEN 5
      WHEN 5 THEN 10
      WHEN 6 THEN 15
      WHEN 7 THEN 20
      WHEN 8 THEN 30
      WHEN 9 THEN 50
      WHEN 10 THEN 999
      ELSE 1
    END;
    
    SELECT COUNT(*) INTO _current_count FROM public.ads WHERE organization_id = NEW.organization_id AND id != NEW.id;
    
    IF _current_count >= _max_ads THEN
      RAISE EXCEPTION 'Je bedrijf (level %) mag maximaal % advertentie(s) hebben', _level, _max_ads;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;