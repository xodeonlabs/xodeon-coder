import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Niet ingelogd" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Niet ingelogd" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roleData || roleData.length === 0) {
      return jsonResponse({ error: "Geen admin" }, 403);
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const app_id = typeof body.app_id === "string" ? body.app_id.trim() : "";

    if (!email || !app_id) return jsonResponse({ error: "Email en app_id zijn vereist" }, 400);
    if (!EMAIL_REGEX.test(email)) return jsonResponse({ error: "Ongeldig e-mailadres" }, 400);
    if (!UUID_REGEX.test(app_id)) return jsonResponse({ error: "Ongeldige app_id" }, 400);

    // Verify app exists
    const { data: app } = await adminClient.from("apps").select("id, owner_id").eq("id", app_id).single();
    if (!app) return jsonResponse({ error: "App niet gevonden" }, 404);

    // Find target user by email
    let targetUser: { id: string } | null = null;
    let page = 1;
    const perPage = 500;
    while (!targetUser) {
      const { data: { users } } = await adminClient.auth.admin.listUsers({ page, perPage });
      targetUser = users?.find((u: any) => u.email?.toLowerCase() === email) ?? null;
      if (targetUser) break;
      if (!users || users.length < perPage) break;
      page++;
    }

    if (!targetUser) return jsonResponse({ error: "Gebruiker niet gevonden" }, 404);
    if (targetUser.id === app.owner_id) return jsonResponse({ error: "Dit is de eigenaar van de app" }, 400);

    // Add as collaborator (admin inserts on behalf of owner)
    const { error: insertErr } = await adminClient.from("project_collaborators").insert({
      app_id,
      user_id: targetUser.id,
      invited_by: user.id,
    });

    if (insertErr) {
      if (insertErr.message.includes("duplicate")) {
        return jsonResponse({ error: "Deze gebruiker is al collaborator" }, 400);
      }
      throw insertErr;
    }

    return jsonResponse({ success: true, message: "Collaborator toegevoegd" });
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
});
