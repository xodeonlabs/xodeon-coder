-- Admin can view all templates
CREATE POLICY "Admins can view all templates"
ON public.templates FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update any template
CREATE POLICY "Admins can update all templates"
ON public.templates FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any template
CREATE POLICY "Admins can delete all templates"
ON public.templates FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));