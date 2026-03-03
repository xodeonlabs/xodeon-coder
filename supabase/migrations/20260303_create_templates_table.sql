-- Templates table for shared, public templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ngc_code TEXT NOT NULL,
  category TEXT DEFAULT 'Overig',
  downloads INT NOT NULL DEFAULT 0,
  rating FLOAT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- RLS for templates (public ones visible to all, private only to creator)
CREATE POLICY "Users can view public templates"
  ON public.templates FOR SELECT TO authenticated
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Public can view public templates (anon)"
  ON public.templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create templates"
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for templates
ALTER PUBLICATION supabase_realtime ADD TABLE public.templates;

-- Indexes for performance
CREATE INDEX idx_templates_public ON public.templates(is_public) WHERE is_public = true;
CREATE INDEX idx_templates_creator ON public.templates(creator_id);
CREATE INDEX idx_templates_category ON public.templates(category) WHERE is_public = true;
