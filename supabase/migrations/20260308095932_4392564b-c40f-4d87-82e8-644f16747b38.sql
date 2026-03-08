
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji text NOT NULL DEFAULT '🚀',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  gradient text NOT NULL DEFAULT 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Anyone can read active ads (public content)
CREATE POLICY "Anyone can view active ads"
  ON public.ads FOR SELECT
  USING (is_active = true);

-- Admins can view all ads (including inactive)
CREATE POLICY "Admins can view all ads"
  ON public.ads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert ads
CREATE POLICY "Admins can insert ads"
  ON public.ads FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update ads
CREATE POLICY "Admins can update ads"
  ON public.ads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete ads
CREATE POLICY "Admins can delete ads"
  ON public.ads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert current hardcoded ads as seed data
INSERT INTO public.ads (emoji, title, description, url, gradient, sort_order) VALUES
  ('🐍', 'The Big Snake Game', 'Speel nu het klassieke slangenspel – gratis!', 'https://the-big-snake-game.lovable.app/', 'linear-gradient(135deg, hsl(145 40% 14%), hsl(var(--secondary)))', 0),
  ('🚀', 'NGC Explorer', 'Bouw je eigen apps met de kracht van NGC-code!', 'https://ngc-explorer.lovable.app/', 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))', 1),
  ('🎮', 'Maak je eigen game', 'Gebruik NGC om in minuten een game te bouwen.', 'https://ngc-explorer.lovable.app/', 'linear-gradient(135deg, hsl(280 40% 14%), hsl(var(--secondary)))', 2),
  ('💡', 'Deel je creatie', 'Publiceer en deel je app met de wereld!', 'https://ngc-explorer.lovable.app/', 'linear-gradient(135deg, hsl(40 40% 14%), hsl(var(--secondary)))', 3);
