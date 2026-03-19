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

    // Check admin or owner role
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
    const { action, target_user_id } = body;

    // Validate input
    if (!target_user_id || typeof target_user_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing target_user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prevent admin from managing themselves
    if (target_user_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot manage your own account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(target_user_id)) {
      return new Response(JSON.stringify({ error: "Invalid user ID format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Protect owners from being managed
    const PROTECTED_EMAILS = ["xodeonlabs@gmail.com", "jbrb@outlook.be", "bastien.gaillard@campusvoeren.be"];
    
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id)
      .eq("role", "owner");
    
    // Also check by email
    const { data: targetUser } = await adminClient.auth.admin.getUserById(target_user_id);
    const targetEmail = targetUser?.user?.email?.toLowerCase() || "";
    
    if ((targetRoles && targetRoles.length > 0) || PROTECTED_EMAILS.includes(targetEmail)) {
      return new Response(JSON.stringify({ error: "Cannot manage a protected platform owner" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ban") {
      // Ban user by updating their ban status
      const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
        ban_duration: "876000h", // ~100 years
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "User banned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban") {
      const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
        ban_duration: "none",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "User unbanned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Delete user's data first (profiles, apps, etc. will cascade via FK)
      // Then delete auth user
      const { error } = await adminClient.auth.admin.deleteUser(target_user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: ban, unban, delete" }), {
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
