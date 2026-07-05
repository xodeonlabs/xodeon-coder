import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // caller must be admin or owner
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerIsOwner = roleData.some((r: any) => r.role === "owner");

    const { target_user_id } = await req.json();
    if (!target_user_id || typeof target_user_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing target_user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (target_user_id === user.id) {
      return new Response(JSON.stringify({ error: "Kan jezelf niet impersoneren" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // fetch target
    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(target_user_id);
    if (getErr || !targetUser?.user?.email) {
      return new Response(JSON.stringify({ error: "Target niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Protect owners: only owners can impersonate owners
    const { data: targetRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id);
    const targetIsOwner = (targetRoles || []).some((r: any) => r.role === "owner");
    if (targetIsOwner && !callerIsOwner) {
      return new Response(JSON.stringify({ error: "Alleen owners kunnen owners impersoneren" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log
    await admin.from("admin_activity_log").insert({
      admin_id: user.id,
      action: "Gebruiker geïmpersoneerd",
      target_type: "user",
      target_id: target_user_id,
      details: { target_email: targetUser.user.email },
    });

    // Generate magic link → gives us hashed_token we can use with verifyOtp
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: linkErr?.message || "Kon geen sessie maken" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        email: targetUser.user.email,
        token_hash: linkData.properties.hashed_token,
        target_user_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
