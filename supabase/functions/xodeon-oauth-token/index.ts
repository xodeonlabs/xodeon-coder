// Exchange authorization code for an access token. Public endpoint.
// Body: { api_key, code, redirect_uri }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { api_key, code, redirect_uri } = await req.json();
    if (!api_key || !code || !redirect_uri) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKeyHash = await sha256(api_key);
    const { data: app } = await admin.from("external_apps").select("id, is_active").eq("api_key_hash", apiKeyHash).maybeSingle();
    if (!app || !app.is_active) {
      return new Response(JSON.stringify({ error: "invalid_client" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: codeRow } = await admin.from("oauth_codes").select("*").eq("code", code).maybeSingle();
    if (!codeRow || codeRow.used || codeRow.external_app_id !== app.id || codeRow.redirect_uri !== redirect_uri || new Date(codeRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("oauth_codes").update({ used: true }).eq("code", code);

    const token = `xod_${randomToken(24)}`;
    const tokenHash = await sha256(token);
    const tokenPrefix = token.slice(0, 12);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await admin.from("oauth_tokens").insert({
      token_hash: tokenHash, token_prefix: tokenPrefix,
      external_app_id: app.id, user_id: codeRow.user_id,
      scopes: codeRow.scopes, expires_at: expires,
    });

    return new Response(JSON.stringify({
      access_token: token, token_type: "Bearer",
      expires_in: 30 * 24 * 60 * 60, scopes: codeRow.scopes,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("token error", e);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
