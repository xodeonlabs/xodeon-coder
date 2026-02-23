import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Niet ingelogd" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Get calling user
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Niet ingelogd" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { email, app_id } = await req.json();
    if (!email || !app_id) return new Response(JSON.stringify({ error: "Email en app_id zijn vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check ownership
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: app } = await adminClient.from("apps").select("owner_id").eq("id", app_id).single();
    if (!app || app.owner_id !== user.id) return new Response(JSON.stringify({ error: "Je bent niet de eigenaar" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Look up user by email
    const { data: { users }, error: lookupErr } = await adminClient.auth.admin.listUsers();
    const targetUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) return new Response(JSON.stringify({ error: "Gebruiker niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (targetUser.id === user.id) return new Response(JSON.stringify({ error: "Je kunt jezelf niet uitnodigen" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Add collaborator
    const { error: insertErr } = await adminClient.from("project_collaborators").insert({
      app_id, user_id: targetUser.id, invited_by: user.id,
    });

    if (insertErr) {
      if (insertErr.message.includes("duplicate")) return new Response(JSON.stringify({ error: "Gebruiker is al uitgenodigd" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, user_email: targetUser.email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
