import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all apps with their retention settings
    const { data: apps, error: appsError } = await supabase
      .from("apps")
      .select("id, chat_retention_hours");

    if (appsError) {
      console.error("Error fetching apps:", appsError);
      return new Response(JSON.stringify({ error: appsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalDeleted = 0;

    for (const app of apps ?? []) {
      const hours = app.chat_retention_hours ?? 12;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("app_id", app.id)
        .lt("created_at", cutoff)
        .select("id");

      if (error) {
        console.error(`Error deleting messages for app ${app.id}:`, error);
        continue;
      }

      const count = data?.length ?? 0;
      if (count > 0) {
        console.log(`Deleted ${count} messages for app ${app.id} (retention: ${hours}h)`);
      }
      totalDeleted += count;
    }

    console.log(`Cleanup complete: ${totalDeleted} total messages deleted`);

    return new Response(JSON.stringify({ success: true, deleted: totalDeleted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleanup-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
