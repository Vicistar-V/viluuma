import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const REVENUECAT_API_KEY = Deno.env.get('REVENUECAT_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Verify JWT token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    console.log('Syncing subscription for user:', user.id);

    // Make direct API call to RevenueCat to get current subscription status
    const revenueCatResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${user.id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!revenueCatResponse.ok) {
      console.error('RevenueCat API error:', revenueCatResponse.status);
      return new Response('Failed to fetch subscription status', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const subscriptionData = await revenueCatResponse.json();
    console.log('RevenueCat response:', JSON.stringify(subscriptionData, null, 2));

    // Check if user has active pro entitlement
    const hasProEntitlement = subscriptionData.subscriber?.entitlements?.pro?.expires_date && 
                              new Date(subscriptionData.subscriber.entitlements.pro.expires_date) > new Date();

    console.log('Has pro entitlement:', hasProEntitlement);

    // Update user's entitlement in profiles table
    const newEntitlement = hasProEntitlement ? 'pro' : 'free';
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        current_entitlement: newEntitlement,
        revenuecat_id: user.id 
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response('Failed to update user profile', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Updated user ${user.id} entitlement to ${newEntitlement}`);

    // Handle subscription state changes
    if (hasProEntitlement) {
      // User has pro access - unarchive system-archived goals
      console.log('Unarchiving system goals for user');
      const { error: unarchiveError } = await supabaseAdmin
        .rpc('unarchive_system_goals_for_user', { p_user_id: user.id });

      if (unarchiveError) {
        console.error('Error unarchiving goals:', unarchiveError);
      }
    } else {
      // User doesn't have pro access - archive excess goals
      console.log('Archiving excess goals for user');
      const { error: archiveError } = await supabaseAdmin
        .rpc('archive_excess_goals_for_user', { p_user_id: user.id });

      if (archiveError) {
        console.error('Error archiving goals:', archiveError);
      }
    }

    console.log('Subscription sync completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      entitlement: newEntitlement 
    }), { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    });

  } catch (error) {
    console.error('Error syncing subscription:', error);
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});