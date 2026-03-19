-- Add user plans and AI usage tracking
CREATE TABLE IF NOT EXISTS public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier text CHECK (plan_tier IN ('free', 'pro', 'plus')) DEFAULT 'free',
  ai_messages_used integer DEFAULT 0,
  ai_messages_limit integer DEFAULT 10,  -- Per month
  ai_lines_used integer DEFAULT 0,
  ai_lines_limit integer DEFAULT 100,    -- Per month
  apps_limit integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  plan_started_at timestamp with time zone DEFAULT now(),
  plan_ends_at timestamp with time zone DEFAULT NULL
);

-- Track AI usage per month
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE SET NULL,
  message_count integer DEFAULT 1,
  lines_added integer DEFAULT 0,
  cost_coins integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Update apps table to add plan requirements
ALTER TABLE public.apps
ADD COLUMN IF NOT EXISTS requires_plan text CHECK (requires_plan IN ('free', 'pro', 'plus')) DEFAULT 'free';

-- Add RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan"
  ON public.user_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage"
  ON public.ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Create plan info table
CREATE TABLE IF NOT EXISTS public.plan_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly integer,
  ai_messages_limit integer NOT NULL,
  ai_lines_limit integer NOT NULL,
  apps_limit integer NOT NULL,
  features text[] DEFAULT ARRAY[]::text[]
);

INSERT INTO public.plan_definitions (tier, name, description, price_monthly, ai_messages_limit, ai_lines_limit, apps_limit, features) VALUES
('free', 'Free', 'Perfect om te starten', 0, 10, 100, 3, ARRAY['Basic AI assistance', 'Limited code generation', '3 apps']),
('pro', 'Pro', 'Voor serieuze developers', 500, 50, 500, 10, ARRAY['Unlimited AI messages', 'Priority support', 'Up to 10 apps', '500 lines per month']),
('plus', 'Plus', 'For power users', 1500, 500, 5000, 50, ARRAY['Unlimited everything', 'Priority support', '50 apps', 'Custom features']),
('enterprise', 'Enterprise', 'Custom solutions', NULL, 0, 0, 999, ARRAY['Everything in Plus', 'Dedicated support']);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_tier ON public.user_plans(plan_tier);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_apps_requires_plan ON public.apps(requires_plan);
