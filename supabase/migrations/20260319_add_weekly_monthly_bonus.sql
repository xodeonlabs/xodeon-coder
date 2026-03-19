-- Add weekly and monthly bonus tracking columns to user_coins
ALTER TABLE public.user_coins
ADD COLUMN IF NOT EXISTS last_weekly_bonus date,
ADD COLUMN IF NOT EXISTS last_monthly_bonus date;

-- Create index for bonus queries
CREATE INDEX IF NOT EXISTS idx_user_coins_bonus_tracking
ON public.user_coins(user_id, last_daily_bonus, last_weekly_bonus, last_monthly_bonus);
