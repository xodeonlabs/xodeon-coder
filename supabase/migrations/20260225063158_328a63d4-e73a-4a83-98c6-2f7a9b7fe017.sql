-- Add unique constraint to prevent duplicate collaborators
ALTER TABLE public.project_collaborators 
ADD CONSTRAINT project_collaborators_app_user_unique UNIQUE (app_id, user_id);

-- Allow collaborators to see their own collaboration records
CREATE POLICY "Collaborators can view own records"
ON public.project_collaborators
FOR SELECT
USING (user_id = auth.uid());
