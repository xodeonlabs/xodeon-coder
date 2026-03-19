-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly integer DEFAULT 0,
  price_yearly integer DEFAULT 0,
  features jsonb DEFAULT '{}',
  ai_calls_daily integer DEFAULT 0,
  max_apps integer DEFAULT 0,
  max_messages_monthly integer DEFAULT 0,
  api_access boolean DEFAULT false,
  team_collaboration boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text CHECK (status IN ('active', 'canceled', 'expired', 'pending')) DEFAULT 'active',
  started_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT NULL,
  auto_renew boolean DEFAULT true,
  stripe_subscription_id text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, status) WHERE status = 'active'
);

-- Create plan usage tracking table
CREATE TABLE IF NOT EXISTS public.plan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_calls_used_today integer DEFAULT 0,
  ai_calls_reset_at timestamp with time zone DEFAULT now(),
  messages_sent_month integer DEFAULT 0,
  messages_reset_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create AI conversation history for better tracking
CREATE TABLE IF NOT EXISTS public.ai_conversation_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  model text DEFAULT 'gpt-3.5-turbo',
  tokens_used integer DEFAULT 0,
  cost_cents integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_meta ENABLE ROW LEVEL SECURITY;

-- Plans are public
CREATE POLICY "Plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their usage
CREATE POLICY "Users can view their own usage"
  ON public.plan_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage plans and subscriptions
CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plan_usage_user_id ON public.plan_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_meta_user_id ON public.ai_conversation_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_meta_created_at ON public.ai_conversation_meta(created_at);

-- Insert default plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, ai_calls_daily, max_apps, max_messages_monthly) VALUES
('Free', 'free', 'Start with Xodeon', 0, 0, 5, 3, 100),
('Pro', 'pro', 'For serious builders', 499, 4990, 50, 10, 1000),
('Plus', 'plus', 'Unlimited everything', 999, 9990, 999999, 50, 999999);

-- Create trigger to initialize plan_usage for new users
CREATE OR REPLACE FUNCTION initialize_plan_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.plan_usage (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_plan_usage
AFTER INSERT ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION initialize_plan_usage();
