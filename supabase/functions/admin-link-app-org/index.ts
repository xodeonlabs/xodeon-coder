import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { app_id, organization_id } = await req.json();
    if (!app_id || typeof app_id !== "string") {
      return new Response(JSON.stringify({ error: "app_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin/owner of the organization
    if (organization_id) {
      const orgIdStr = String(organization_id).replace(/[^a-f0-9-]/gi, "");
      const { data: membership } = await adminClient
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgIdStr)
        .eq("user_id", user.id)
        .single();

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return new Response(JSON.stringify({ error: "Must be org admin/owner" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Verify the app is public (can only link public apps from others)
    const appIdStr = String(app_id).replace(/[^a-f0-9-]/gi, "");
    const { data: app } = await adminClient.from("apps").select("id, owner_id, is_public").eq("id", appIdStr).single();
    if (!app) {
      return new Response(JSON.stringify({ error: "App not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Allow if: user owns the app, OR app is public
    if (app.owner_id !== user.id && !app.is_public) {
      return new Response(JSON.stringify({ error: "Can only link public apps" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update the app's organization_id
    const { error } = await adminClient
      .from("apps")
      .update({ organization_id: organization_id || null })
      .eq("id", appIdStr);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
