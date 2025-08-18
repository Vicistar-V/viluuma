import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('Getting intelligence payload for user...');

    // Execute both queries in parallel for maximum performance
    const [dailyDigestResult, coachingNudgeResult] = await Promise.all([
      // Get today's task summary for the morning digest
      supabase.rpc('get_today_tasks_summary'),
      
      // Get and claim the next pending message (atomic operation)
      supabase.rpc('get_next_pending_message')
    ]);

    console.log('Daily digest result:', dailyDigestResult);
    console.log('Coaching nudge result:', coachingNudgeResult);

    // Handle any errors from the database calls
    if (dailyDigestResult.error) {
      console.error('Error getting daily digest:', dailyDigestResult.error);
      throw dailyDigestResult.error;
    }

    if (coachingNudgeResult.error) {
      console.error('Error getting coaching nudge:', coachingNudgeResult.error);
      throw coachingNudgeResult.error;
    }

    // Build the complete intelligence payload
    const payload = {
      dailyDigest: dailyDigestResult.data || {
        taskCount: 0,
        firstTaskTitle: 'No tasks scheduled',
        generatedAt: new Date().toISOString()
      },
      coachingNudge: coachingNudgeResult.data && coachingNudgeResult.data.length > 0 
        ? coachingNudgeResult.data[0] 
        : null,
      timestamp: new Date().toISOString()
    };

    console.log('Final payload:', payload);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-intelligence-payload function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});