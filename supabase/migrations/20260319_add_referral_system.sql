-- Create referral system tables
CREATE TABLE IF NOT EXISTS public.user_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  uses integer DEFAULT 0,
  reward_coins integer DEFAULT 50
);

CREATE TABLE IF NOT EXISTS public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Create user suspension table for admin
CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  suspended_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT NULL,
  suspended_by uuid
);

-- Add RLS
ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- Users can see their own referral code
CREATE POLICY "Users can view their own referral code"
  ON public.user_referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their referrals
CREATE POLICY "Users can view their referrals"
  ON public.user_referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Admins can manage suspensions
CREATE POLICY "Admins can manage suspensions"
  ON public.user_suspensions FOR ALL
  USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON public.user_referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_user_id ON public.user_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_id ON public.user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred_id ON public.user_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON public.user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_expires_at ON public.user_suspensions(expires_at);
