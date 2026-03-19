
-- Function to check if a user is a protected owner (by email)
CREATE OR REPLACE FUNCTION public.is_protected_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND email IN ('xodeonlabs@gmail.com', 'jbrb@outlook.be', 'bastien.gaillard@campusvoeren.be')
  );
$$;

-- Trigger to prevent deletion of owner roles for protected users
CREATE OR REPLACE FUNCTION public.prevent_protected_owner_role_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.role IN ('owner', 'admin') AND is_protected_owner(OLD.user_id) THEN
    RAISE EXCEPTION 'Cannot remove role from a protected platform owner';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_protect_owner_role_delete
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_owner_role_delete();

-- Trigger to prevent changing owner role for protected users  
CREATE OR REPLACE FUNCTION public.prevent_protected_owner_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.role = 'owner' AND NEW.role != 'owner' AND is_protected_owner(OLD.user_id) THEN
    RAISE EXCEPTION 'Cannot change role of a protected platform owner';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_owner_role_update
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_owner_role_update();

-- Auto-assign owner role to protected users on profile creation
CREATE OR REPLACE FUNCTION public.auto_assign_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF is_protected_owner(NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_owner
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_owner_role();
