// Public data API for external apps. Auth: x-api-key + Authorization: Bearer <token>.
// Routes: /me, /friends, /messages, /apps  (use ?path=... or trailing path)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  // Path supports either ?path=me or trailing path after function name
  const rawPath = url.searchParams.get("path") ?? url.pathname.split("/xodeon-api/").pop() ?? "";
  const path = rawPath.replace(/^\/+|\/+$/g, "").toLowerCase();

  const apiKey = req.headers.get("x-api-key") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  let appId: string | null = null;
  let userId: string | null = null;
  let scopes: string[] = [];
  let status = 200;

  try {
    if (!apiKey || !bearer) { status = 401; return json({ error: "missing_credentials" }, 401); }
    const apiKeyHash = await sha256(apiKey);
    const { data: app } = await admin.from("external_apps").select("id, is_active").eq("api_key_hash", apiKeyHash).maybeSingle();
    if (!app || !app.is_active) { status = 401; return json({ error: "invalid_api_key" }, 401); }
    appId = app.id;

    const tokenHash = await sha256(bearer);
    const { data: tok } = await admin.from("oauth_tokens").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!tok || tok.revoked || tok.external_app_id !== app.id || new Date(tok.expires_at) < new Date()) {
      status = 401; return json({ error: "invalid_token" }, 401);
    }
    userId = tok.user_id;
    scopes = tok.scopes as string[];

    await admin.from("oauth_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tok.id);

    const need = (s: string) => {
      if (!scopes.includes(s)) { status = 403; return false; }
      return true;
    };

    if (path === "me" || path === "") {
      if (!need("profile")) return json({ error: "scope_required", scope: "profile" }, 403);
      const { data: p } = await admin.from("profiles").select("id, username, display_name, avatar_url, bio, banner_url, country").eq("id", userId).maybeSingle();
      return json({ user: p });
    }
    if (path === "friends") {
      if (!need("friends")) return json({ error: "scope_required", scope: "friends" }, 403);
      const { data: fs } = await admin.from("friendships").select("sender_id, receiver_id, status, created_at").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted");
      const ids = (fs ?? []).map((f: any) => f.sender_id === userId ? f.receiver_id : f.sender_id);
      const { data: profs } = ids.length ? await admin.from("profiles").select("id, username, display_name, avatar_url").in("id", ids) : { data: [] };
      return json({ friends: profs ?? [] });
    }
    if (path === "messages") {
      if (!need("messages")) return json({ error: "scope_required", scope: "messages" }, 403);
      const { data: msgs } = await admin.from("friend_messages").select("id, sender_id, receiver_id, content, created_at, read_at").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order("created_at", { ascending: false }).limit(200);
      return json({ messages: msgs ?? [] });
    }
    if (path === "apps") {
      if (!need("apps")) return json({ error: "scope_required", scope: "apps" }, 403);
      const { data: apps } = await admin.from("apps").select("id, name, ngc_code, icon, is_public, created_at, updated_at, slug").eq("owner_id", userId);
      return json({ apps: apps ?? [] });
    }
    status = 404;
    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error("xodeon-api error", e);
    status = 500;
    return json({ error: "server_error" }, 500);
  } finally {
    if (appId) {
      admin.from("external_app_usage").insert({
        external_app_id: appId, user_id: userId, endpoint: path || "/", method: req.method, status_code: status,
      }).then(() => {}, () => {});
    }
  }
});
