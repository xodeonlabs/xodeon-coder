import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const AD_COST = 10;

  // Get all active ads that belong to an organization
  const { data: ads, error: adsErr } = await supabase
    .from("ads")
    .select("id, organization_id, title")
    .eq("is_active", true)
    .not("organization_id", "is", null);

  if (adsErr) {
    return new Response(JSON.stringify({ error: adsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { org: string; ad: string; status: string }[] = [];

  for (const ad of ads || []) {
    const orgId = ad.organization_id;

    // Get org coin balance
    const { data: coinRow } = await supabase
      .from("org_coins")
      .select("id, balance")
      .eq("organization_id", orgId)
      .eq("name", "coins")
      .maybeSingle();

    const balance = coinRow?.balance ?? 0;

    if (balance >= AD_COST) {
      // Deduct coins
      await supabase
        .from("org_coins")
        .update({ balance: balance - AD_COST, updated_at: new Date().toISOString() })
        .eq("id", coinRow!.id);

      // Log transaction
      await supabase.from("org_coin_transactions").insert({
        organization_id: orgId,
        user_id: "00000000-0000-0000-0000-000000000000",
        amount: AD_COST,
        type: "ad_fee",
        coin_name: "coins",
        note: `Maandelijkse advertentiekosten: ${ad.title}`,
      });

      results.push({ org: orgId, ad: ad.id, status: "charged" });
    } else {
      // Not enough coins — deactivate ad
      await supabase
        .from("ads")
        .update({ is_active: false })
        .eq("id", ad.id);

      results.push({ org: orgId, ad: ad.id, status: "deactivated_insufficient_funds" });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
