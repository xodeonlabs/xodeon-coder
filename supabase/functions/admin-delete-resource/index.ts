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

    // Verify caller
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { type, target_id } = body;

    // Validate input
    if (!target_id || typeof target_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing target_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(target_id)) {
      return new Response(JSON.stringify({ error: "Invalid ID format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "toggle_public") {
      const { data: appData } = await adminClient.from("apps").select("is_public").eq("id", target_id).single();
      if (!appData) {
        return new Response(JSON.stringify({ error: "App not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await adminClient.from("apps").update({ is_public: !appData.is_public }).eq("id", target_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, is_public: !appData.is_public }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "app") {
      const { error } = await adminClient.from("apps").delete().eq("id", target_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "App deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "org") {
      // Delete members first, then org
      await adminClient.from("organization_members").delete().eq("organization_id", target_id);
      const { error } = await adminClient.from("organizations").delete().eq("id", target_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Organization deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "alliance") {
      const { error } = await adminClient.from("alliances").delete().eq("id", target_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Alliance deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "alliance_add_member") {
      const { org_id } = body;
      if (!org_id || !uuidRegex.test(org_id)) {
        return new Response(JSON.stringify({ error: "Invalid org_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await adminClient.from("alliance_members").insert({ alliance_id: target_id, organization_id: org_id });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Member added" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "alliance_remove_member") {
      const { error } = await adminClient.from("alliance_members").delete().eq("id", target_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Member removed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
