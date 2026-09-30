import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/slack-connect', '');

    // GET /status — check if Slack is connected
    if (path === '/status' && req.method === 'GET') {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabaseAdmin
        .from('slack_connections')
        .select('id, team_id, team_name, channel_id, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          connected: !!data,
          connection: data,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /disconnect — remove Slack connection
    if (path === '/disconnect' && req.method === 'POST') {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { error } = await supabaseAdmin
        .from('slack_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Slack disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /connect — simulate Slack OAuth (in production, this would redirect to Slack)
    if (path === '/connect' && req.method === 'POST') {
      const body = await req.json();
      const { teamName, teamId, accessToken, channelId } = body;

      if (!teamName || !accessToken) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // Upsert: delete existing, insert new
      await supabaseAdmin
        .from('slack_connections')
        .delete()
        .eq('user_id', user.id);

      const { data, error } = await supabaseAdmin
        .from('slack_connections')
        .insert({
          user_id: user.id,
          team_id: teamId || 'demo-team',
          team_name: teamName,
          access_token: accessToken,
          channel_id: channelId || null,
        })
        .select('id, team_id, team_name, channel_id, created_at')
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, connection: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[slack-connect] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
