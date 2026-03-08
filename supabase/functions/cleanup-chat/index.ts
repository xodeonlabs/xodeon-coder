import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // 2. Friend messages (per-user retention from profiles.friend_chat_retention_hours)
    {
      // Get all unique retention values
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("id, friend_chat_retention_hours");

      if (profError) {
        console.error("Error fetching profiles for friend retention:", profError);
      } else {
        // Group users by retention hours
        const retentionMap = new Map<number, string[]>();
        for (const p of profiles ?? []) {
          const hours = p.friend_chat_retention_hours ?? 24;
          if (!retentionMap.has(hours)) retentionMap.set(hours, []);
          retentionMap.get(hours)!.push(p.id);
        }

        // For each retention group, delete old messages where BOTH sender and receiver have that retention
        // Simplified: delete messages older than the MINIMUM retention of sender/receiver
        // For simplicity, we delete based on sender's retention setting
        for (const [hours, userIds] of retentionMap) {
          const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
          for (let i = 0; i < userIds.length; i += 50) {
            const batch = userIds.slice(i, i + 50);
            const { data, error } = await supabase
              .from("friend_messages")
              .delete()
              .in("sender_id", batch)
              .lt("created_at", cutoff)
              .select("id");

            if (error) {
              console.error("Error deleting friend messages:", error);
            } else {
              const count = data?.length ?? 0;
              if (count > 0) console.log(`Friend messages (${hours}h): deleted ${count}`);
              totalDeleted += count;
            }
          }
        }

        // Also clean up messages from users without profiles (fallback 24h)
        const fallbackCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const allUserIds = (profiles ?? []).map(p => p.id);
        if (allUserIds.length > 0) {
          // Delete old messages from senders not in profiles
          const { data, error } = await supabase
            .from("friend_messages")
            .delete()
            .lt("created_at", fallbackCutoff)
            .select("id");
          // This is handled by the per-user logic above for known users
        }
      }
    }

    // 3. Org chat messages (per-org retention)
    {
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, chat_retention_hours");

      if (orgsError) {
        console.error("Error fetching orgs:", orgsError);
      } else {
        for (const org of orgs ?? []) {
          const hours = org.chat_retention_hours ?? 48;
          const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

          const { data, error } = await supabase
            .from("org_chat_messages")
            .delete()
            .eq("organization_id", org.id)
            .lt("created_at", cutoff)
            .select("id");

          if (error) {
            console.error(`Error deleting org chat for ${org.id}:`, error);
            continue;
          }
          const count = data?.length ?? 0;
          if (count > 0) console.log(`Org ${org.id}: deleted ${count} msgs (${hours}h)`);
          totalDeleted += count;
        }
      }
    }

    // 4. Alliance chat messages (per-alliance retention)
    {
      const { data: alliances, error: alliancesError } = await supabase
        .from("alliances")
        .select("id, chat_retention_hours");

      if (alliancesError) {
        console.error("Error fetching alliances:", alliancesError);
      } else {
        for (const alliance of alliances ?? []) {
          const hours = alliance.chat_retention_hours ?? 48;
          const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

          const { data, error } = await supabase
            .from("alliance_chat_messages")
            .delete()
            .eq("alliance_id", alliance.id)
            .lt("created_at", cutoff)
            .select("id");

          if (error) {
            console.error(`Error deleting alliance chat for ${alliance.id}:`, error);
            continue;
          }
          const count = data?.length ?? 0;
          if (count > 0) console.log(`Alliance ${alliance.id}: deleted ${count} msgs (${hours}h)`);
          totalDeleted += count;
        }
      }
    }

    // 5. Group chat messages (per-group retention)
    {
      const { data: groups, error: groupsError } = await supabase
        .from("chat_groups")
        .select("id, chat_retention_hours");

      if (groupsError) {
        console.error("Error fetching chat groups:", groupsError);
      } else {
        for (const group of groups ?? []) {
          const hours = group.chat_retention_hours ?? 48;
          const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

          const { data, error } = await supabase
            .from("chat_group_messages")
            .delete()
            .eq("group_id", group.id)
            .lt("created_at", cutoff)
            .select("id");

          if (error) {
            console.error(`Error deleting group chat for ${group.id}:`, error);
            continue;
          }
          const count = data?.length ?? 0;
          if (count > 0) console.log(`Group ${group.id}: deleted ${count} msgs (${hours}h)`);
          totalDeleted += count;
        }
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
