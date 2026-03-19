-- Create coin shop tables
CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  description text,
  icon_emoji text NOT NULL DEFAULT '🎁',
  cost integer NOT NULL,
  category text DEFAULT 'cosmetic',  -- cosmetic, feature, boost
  rarity text CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  active boolean DEFAULT true,
  max_purchases_per_user integer DEFAULT NULL,  -- NULL = unlimited
  duration_days integer DEFAULT NULL  -- NULL = permanent
);

CREATE TABLE IF NOT EXISTS public.user_shop_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  expires_at timestamp with time zone DEFAULT NULL,  -- NULL = permanent
  quantity integer DEFAULT 1
);

-- Add RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shop_purchases ENABLE ROW LEVEL SECURITY;

-- Shop items are public
CREATE POLICY "Shop items are viewable by everyone"
  ON public.shop_items FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage shop items"
  ON public.shop_items FOR ALL
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Users can see their own purchases
CREATE POLICY "Users can view their own purchases"
  ON public.user_shop_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON public.user_shop_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert sample shop items
INSERT INTO public.shop_items (name, description, icon_emoji, cost, category, rarity) VALUES
('Golden Badge', 'Exclusive golden badge for your profile', '✨', 500, 'cosmetic', 'rare'),
('Custom Username Color', 'Change your username color in chat', '🎨', 250, 'cosmetic', 'uncommon'),
('VIP Status', 'Get VIP badge and benefits for 30 days', '👑', 1000, 'feature', 'epic'),
('2x Coin Boost', 'Double coin earnings for 7 days', '2️⃣', 300, 'boost', 'uncommon'),
('Premium Avatar Border', 'Glowing border for your avatar', '✨', 200, 'cosmetic', 'uncommon'),
('Chat Theme Bundle', '5 exclusive chat themes', '🎭', 400, 'cosmetic', 'rare'),
('Name Glow Effect', 'Make your name glow in chat', '💫', 350, 'cosmetic', 'rare'),
('Legendary Status', 'Most exclusive badge in the game', '🔥', 2000, 'feature', 'legendary');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON public.shop_items(category);
CREATE INDEX IF NOT EXISTS idx_user_shop_purchases_user_id ON public.user_shop_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shop_purchases_expires_at ON public.user_shop_purchases(expires_at);
