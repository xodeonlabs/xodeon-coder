import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Niet ingelogd" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!serviceKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "Server configuratie fout" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !user) return jsonResponse({ error: "Niet ingelogd" }, 401);

    // --- Input validation ---
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Ongeldige request body" }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const app_id = typeof body.app_id === 'string' ? body.app_id.trim() : '';

    if (!email || !app_id) return jsonResponse({ error: "Email en app_id zijn vereist" }, 400);
    if (email.length > 255 || !EMAIL_REGEX.test(email)) return jsonResponse({ error: "Ongeldig e-mailadres" }, 400);
    if (!UUID_REGEX.test(app_id)) return jsonResponse({ error: "Ongeldige app_id" }, 400);

    // Check ownership
    const { data: app } = await adminClient.from("apps").select("owner_id").eq("id", app_id).single();
    if (!app || app.owner_id !== user.id) return jsonResponse({ error: "Je bent niet de eigenaar" }, 403);

    // Look up user by email
    let targetUser: { id: string; email?: string } | null = null;
    let page = 1;
    const perPage = 500;
    while (!targetUser) {
      const { data: { users }, error: lookupErr } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (lookupErr) {
        console.error("listUsers error:", lookupErr);
        return jsonResponse({ error: "Kan gebruikers niet ophalen" }, 500);
      }
      targetUser = users?.find((u: { id: string; email?: string }) => u.email?.toLowerCase() === email) ?? null;
      if (targetUser) break;
      if (!users || users.length < perPage) break;
      page++;
    }

    // Generic response to prevent user enumeration
    if (!targetUser) {
      return jsonResponse({ success: true, message: "Als dit e-mailadres een account heeft, is de uitnodiging verstuurd." });
    }

    if (targetUser.id === user.id) return jsonResponse({ error: "Je kunt jezelf niet uitnodigen" }, 400);

    // Add collaborator
    const { error: insertErr } = await adminClient.from("project_collaborators").insert({
      app_id, user_id: targetUser.id, invited_by: user.id,
    });

    if (insertErr) {
      console.error("insert error:", insertErr);
      if (insertErr.message.includes("duplicate")) {
        // Return same generic message to prevent enumeration
        return jsonResponse({ success: true, message: "Als dit e-mailadres een account heeft, is de uitnodiging verstuurd." });
      }
      return jsonResponse({ error: "Er is een fout opgetreden bij het uitnodigen." }, 500);
    }

    return jsonResponse({ success: true, message: "Uitnodiging is verstuurd.", collaborator_id: targetUser.id });
  } catch (e) {
    console.error("Unexpected error:", e);
    return jsonResponse({ error: "Er is een onverwachte fout opgetreden." }, 500);
  }
});
