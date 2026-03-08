
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ngc_code TEXT NOT NULL DEFAULT '',
  author_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'algemeen',
  downloads INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view published templates
CREATE POLICY "Anyone can view published templates"
  ON public.templates FOR SELECT
  USING (is_published = true);

-- Authors can view own templates
CREATE POLICY "Authors can view own templates"
  ON public.templates FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- Authors can create templates
CREATE POLICY "Authors can create templates"
  ON public.templates FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Authors can update own templates
CREATE POLICY "Authors can update own templates"
  ON public.templates FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- Authors can delete own templates
CREATE POLICY "Authors can delete own templates"
  ON public.templates FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Anyone authenticated can increment downloads
CREATE POLICY "Anyone can increment downloads"
  ON public.templates FOR UPDATE
  TO authenticated
  USING (is_published = true)
  WITH CHECK (is_published = true);
