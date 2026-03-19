-- Create achievements and user achievements tables
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon_emoji text NOT NULL DEFAULT '🏆',
  requirement text NOT NULL,  -- JSON describing the requirement
  points_reward integer DEFAULT 0,
  rarity text CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common'
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Add RLS policies
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are public (anyone can see them)
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

-- Users can only see their own achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can see all achievements
CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage user achievements"
  ON public.user_achievements FOR ALL
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon_emoji, requirement, points_reward, rarity) VALUES
('Welcome to Xodeon', 'Create your first app', '🎉', '{"type": "app_created", "count": 1}', 10, 'common'),
('First Steps', 'Share your first app', '👣', '{"type": "app_shared", "count": 1}', 15, 'common'),
('Social Butterfly', 'Add 5 friends', '🦋', '{"type": "friends_count", "count": 5}', 25, 'uncommon'),
('Coin Collector', 'Earn 100 coins', '🪙', '{"type": "coins_earned", "count": 100}', 20, 'uncommon'),
('Daily Grinder', 'Claim daily bonus 7 days in a row', '🔥', '{"type": "daily_bonus_streak", "count": 7}', 50, 'rare'),
('Chat Master', 'Send 50 messages', '💬', '{"type": "messages_sent", "count": 50}', 30, 'uncommon'),
('Builder Elite', 'Create 10 apps', '🏗️', '{"type": "app_created", "count": 10}', 100, 'rare'),
('Legend', 'Earn 1000 coins', '👑', '{"type": "coins_earned", "count": 1000}', 500, 'legendary');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
