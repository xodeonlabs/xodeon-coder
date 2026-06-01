
-- 1) External apps registered by developers
CREATE TABLE public.external_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  domain text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  api_key_hash text NOT NULL UNIQUE,
  api_key_prefix text NOT NULL,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_apps TO authenticated;
GRANT ALL ON public.external_apps TO service_role;

ALTER TABLE public.external_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own apps" ON public.external_apps
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins view all apps" ON public.external_apps
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners create apps" ON public.external_apps
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update own apps" ON public.external_apps
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners delete own apps" ON public.external_apps
  FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins update all apps" ON public.external_apps
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete all apps" ON public.external_apps
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_external_apps_updated
  BEFORE UPDATE ON public.external_apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) OAuth authorization codes
CREATE TABLE public.oauth_codes (
  code text PRIMARY KEY,
  external_app_id uuid NOT NULL,
  user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.oauth_codes TO service_role;
ALTER TABLE public.oauth_codes ENABLE ROW LEVEL SECURITY;
-- No client policies; service_role only via edge functions

-- 3) Access tokens
CREATE TABLE public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  external_app_id uuid NOT NULL,
  user_id uuid NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

GRANT SELECT ON public.oauth_tokens TO authenticated;
GRANT ALL ON public.oauth_tokens TO service_role;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tokens" ON public.oauth_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all tokens" ON public.oauth_tokens
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) User grants (which apps user authorized)
CREATE TABLE public.oauth_user_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  external_app_id uuid NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id, external_app_id)
);

GRANT SELECT, UPDATE, DELETE ON public.oauth_user_grants TO authenticated;
GRANT ALL ON public.oauth_user_grants TO service_role;
ALTER TABLE public.oauth_user_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own grants" ON public.oauth_user_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all grants" ON public.oauth_user_grants
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users revoke own grants" ON public.oauth_user_grants
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own grants" ON public.oauth_user_grants
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "App owners view grants for their apps" ON public.oauth_user_grants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.external_apps ea
      WHERE ea.id = oauth_user_grants.external_app_id AND ea.owner_id = auth.uid())
  );

-- 5) API usage log
CREATE TABLE public.external_app_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_app_id uuid NOT NULL,
  user_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  status_code int NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.external_app_usage TO authenticated;
GRANT ALL ON public.external_app_usage TO service_role;
ALTER TABLE public.external_app_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all usage" ON public.external_app_usage
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "App owners view their usage" ON public.external_app_usage
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.external_apps ea
      WHERE ea.id = external_app_usage.external_app_id AND ea.owner_id = auth.uid())
  );

CREATE INDEX idx_external_app_usage_app_time ON public.external_app_usage(external_app_id, created_at DESC);
CREATE INDEX idx_external_app_usage_endpoint ON public.external_app_usage(external_app_id, endpoint);
CREATE INDEX idx_oauth_tokens_app_user ON public.oauth_tokens(external_app_id, user_id);
CREATE INDEX idx_oauth_grants_user ON public.oauth_user_grants(user_id);
