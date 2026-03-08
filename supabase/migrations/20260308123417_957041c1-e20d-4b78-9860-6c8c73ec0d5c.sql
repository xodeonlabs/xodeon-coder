
-- Create collaborator_contracts table
CREATE TABLE public.collaborator_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL,
  proposed_by uuid NOT NULL,
  percentage integer NOT NULL DEFAULT 10,
  counter_percentage integer,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id, collaborator_id)
);

-- Validation trigger for percentage (1-50)
CREATE OR REPLACE FUNCTION public.validate_contract_percentage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.percentage < 1 OR NEW.percentage > 50 THEN
    RAISE EXCEPTION 'Percentage moet tussen 1 en 50 liggen';
  END IF;
  IF NEW.counter_percentage IS NOT NULL AND (NEW.counter_percentage < 1 OR NEW.counter_percentage > 50) THEN
    RAISE EXCEPTION 'Tegenvoorstel percentage moet tussen 1 en 50 liggen';
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected', 'counter') THEN
    RAISE EXCEPTION 'Ongeldige contract status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contract_percentage_trigger
  BEFORE INSERT OR UPDATE ON public.collaborator_contracts
  FOR EACH ROW EXECUTE FUNCTION public.validate_contract_percentage();

-- Enable RLS
ALTER TABLE public.collaborator_contracts ENABLE ROW LEVEL SECURITY;

-- App owners can manage contracts
CREATE POLICY "App owners can view contracts"
  ON public.collaborator_contracts FOR SELECT
  USING (is_app_owner(app_id));

CREATE POLICY "App owners can insert contracts"
  ON public.collaborator_contracts FOR INSERT
  WITH CHECK (is_app_owner(app_id) AND proposed_by = auth.uid());

CREATE POLICY "App owners can update contracts"
  ON public.collaborator_contracts FOR UPDATE
  USING (is_app_owner(app_id));

CREATE POLICY "App owners can delete contracts"
  ON public.collaborator_contracts FOR DELETE
  USING (is_app_owner(app_id));

-- Collaborators can view and update their own contracts
CREATE POLICY "Collaborators can view own contracts"
  ON public.collaborator_contracts FOR SELECT
  USING (collaborator_id = auth.uid());

CREATE POLICY "Collaborators can update own contracts"
  ON public.collaborator_contracts FOR UPDATE
  USING (collaborator_id = auth.uid());
