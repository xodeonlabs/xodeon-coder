// Issues an OAuth authorization code after the user clicks "Allow" on consent screen.
// Requires a valid Xodeon user session (JWT).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function randomCode(len = 48) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { external_app_id, redirect_uri, scopes } = await req.json();
    if (!external_app_id || !redirect_uri || !Array.isArray(scopes)) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: app } = await admin.from("external_apps").select("id, redirect_uris, is_active").eq("id", external_app_id).maybeSingle();
    if (!app || !app.is_active) {
      return new Response(JSON.stringify({ error: "invalid_client" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(app.redirect_uris as string[]).includes(redirect_uri)) {
      return new Response(JSON.stringify({ error: "invalid_redirect_uri" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allowedScopes = ["profile", "friends", "messages", "apps"];
    const cleanScopes = scopes.filter((s: string) => allowedScopes.includes(s));

    // Upsert grant
    await admin.from("oauth_user_grants").upsert(
      { user_id: user.id, external_app_id, scopes: cleanScopes, revoked_at: null },
      { onConflict: "user_id,external_app_id" }
    );

    const code = randomCode(24);
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await admin.from("oauth_codes").insert({
      code, external_app_id, user_id: user.id, redirect_uri, scopes: cleanScopes, expires_at: expires,
    });

    return new Response(JSON.stringify({ code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("issue-code error", e);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
