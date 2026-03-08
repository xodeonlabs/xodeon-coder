import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { action, user_id, amount } = await req.json()

    if (!user_id || typeof amount !== 'number') {
      return new Response(JSON.stringify({ error: 'Missing user_id or amount' }), { status: 400, headers: corsHeaders })
    }

    if (action === 'set') {
      // Set absolute balance
      const { error } = await supabaseAdmin
        .from('user_coins')
        .upsert({ user_id, balance: Math.max(0, amount), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      }
    } else if (action === 'add') {
      // Add to current balance
      const { data: current } = await supabaseAdmin
        .from('user_coins')
        .select('balance')
        .eq('user_id', user_id)
        .maybeSingle()

      const currentBalance = current?.balance ?? 100
      const newBalance = Math.max(0, currentBalance + amount)

      const { error } = await supabaseAdmin
        .from('user_coins')
        .upsert({ user_id, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      }
    } else if (action === 'list') {
      // List all user coins
      const { data, error } = await supabaseAdmin
        .from('user_coins')
        .select('user_id, balance, updated_at')
        .order('balance', { ascending: false })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      }
      return new Response(JSON.stringify({ coins: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
