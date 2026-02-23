import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Niet ingelogd" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!serviceKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuratie fout" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify the calling user via their JWT
    const adminClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !user) return new Response(JSON.stringify({ error: "Niet ingelogd" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { email, app_id } = await req.json();
    if (!email || !app_id) return new Response(JSON.stringify({ error: "Email en app_id zijn vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check ownership
    const { data: app } = await adminClient.from("apps").select("owner_id").eq("id", app_id).single();
    if (!app || app.owner_id !== user.id) return new Response(JSON.stringify({ error: "Je bent niet de eigenaar" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Look up user by email
    const { data: { users }, error: lookupErr } = await adminClient.auth.admin.listUsers();
    if (lookupErr) {
      console.error("listUsers error:", lookupErr);
      return new Response(JSON.stringify({ error: "Kan gebruikers niet ophalen" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const targetUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) return new Response(JSON.stringify({ error: "Gebruiker niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (targetUser.id === user.id) return new Response(JSON.stringify({ error: "Je kunt jezelf niet uitnodigen" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Add collaborator using admin client (bypasses RLS)
    const { error: insertErr } = await adminClient.from("project_collaborators").insert({
      app_id, user_id: targetUser.id, invited_by: user.id,
    });

    if (insertErr) {
      console.error("insert error:", insertErr);
      if (insertErr.message.includes("duplicate")) return new Response(JSON.stringify({ error: "Gebruiker is al uitgenodigd" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, user_email: targetUser.email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
