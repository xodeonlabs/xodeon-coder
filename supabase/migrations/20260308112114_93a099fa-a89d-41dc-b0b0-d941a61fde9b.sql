
-- Seed existing users who don't have a coins row yet
INSERT INTO public.user_coins (user_id, balance)
SELECT id, 100 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_coins)
ON CONFLICT (user_id) DO NOTHING;
