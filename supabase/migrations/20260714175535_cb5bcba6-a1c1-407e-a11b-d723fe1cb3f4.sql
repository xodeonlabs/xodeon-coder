
CREATE OR REPLACE FUNCTION public.admin_export_users()
RETURNS TABLE(id uuid, email text, username text, password_hash text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, p.username, u.encrypted_password::text AS password_hash, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_export_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_export_users() TO authenticated;
