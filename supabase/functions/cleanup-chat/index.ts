import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRIEND_CHAT_RETENTION_HOURS = 24;
const ORG_CHAT_RETENTION_HOURS = 48;
const ALLIANCE_CHAT_RETENTION_HOURS = 48;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let totalDeleted = 0;

    // 1. App chat messages (per-app retention)
    const { data: apps, error: appsError } = await supabase
      .from("apps")
      .select("id, chat_retention_hours");

    if (appsError) {
      console.error("Error fetching apps:", appsError);
    } else {
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
          console.error(`Error deleting app chat for ${app.id}:`, error);
          continue;
        }
        const count = data?.length ?? 0;
        if (count > 0) console.log(`App ${app.id}: deleted ${count} msgs (${hours}h)`);
        totalDeleted += count;
      }
    }

    // 2. Friend messages
    {
      const cutoff = new Date(Date.now() - FRIEND_CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("friend_messages")
        .delete()
        .lt("created_at", cutoff)
        .select("id");

      if (error) {
        console.error("Error deleting friend messages:", error);
      } else {
        const count = data?.length ?? 0;
        if (count > 0) console.log(`Friend messages: deleted ${count} (${FRIEND_CHAT_RETENTION_HOURS}h)`);
        totalDeleted += count;
      }
    }

    // 3. Org chat messages
    {
      const cutoff = new Date(Date.now() - ORG_CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("org_chat_messages")
        .delete()
        .lt("created_at", cutoff)
        .select("id");

      if (error) {
        console.error("Error deleting org chat messages:", error);
      } else {
        const count = data?.length ?? 0;
        if (count > 0) console.log(`Org chat: deleted ${count} (${ORG_CHAT_RETENTION_HOURS}h)`);
        totalDeleted += count;
      }
    }

    // 4. Alliance chat messages
    {
      const cutoff = new Date(Date.now() - ALLIANCE_CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("alliance_chat_messages")
        .delete()
        .lt("created_at", cutoff)
        .select("id");

      if (error) {
        console.error("Error deleting alliance chat messages:", error);
      } else {
        const count = data?.length ?? 0;
        if (count > 0) console.log(`Alliance chat: deleted ${count} (${ALLIANCE_CHAT_RETENTION_HOURS}h)`);
        totalDeleted += count;
      }
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
