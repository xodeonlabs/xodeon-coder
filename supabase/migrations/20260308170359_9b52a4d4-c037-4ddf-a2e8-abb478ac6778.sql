-- Add chat retention columns to organizations and alliances
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS chat_retention_hours integer NOT NULL DEFAULT 48;
ALTER TABLE public.alliances ADD COLUMN IF NOT EXISTS chat_retention_hours integer NOT NULL DEFAULT 48;

-- Add friend chat retention to profiles (per-user setting)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_chat_retention_hours integer NOT NULL DEFAULT 24;