import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, revenuecat-signature',
};

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

// Verify RevenueCat webhook signature
async function verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
  if (!REVENUECAT_WEBHOOK_SECRET || !signature) {
    return false;
  }

  // RevenueCat uses HMAC-SHA256 for webhook signatures
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(REVENUECAT_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Compare signatures securely
  return signature === expectedSignatureHex;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('RevenueCat webhook received');
    
    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get('revenuecat-signature');

    console.log('Signature header:', signature ? 'Present' : 'Missing');

    // Verify the webhook signature
    if (!signature || !await verifyWebhookSignature(body, signature.replace('sha256=', ''))) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Parse the webhook event
    const event = JSON.parse(body);
    console.log('Event type:', event.type);
    console.log('App user ID:', event.app_user_id);

    if (!event.app_user_id) {
      console.error('No app_user_id in webhook event');
      return new Response('Bad Request: Missing app_user_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Determine if user has pro entitlement
    const hasProEntitlement = event.entitlements && 
                              Object.values(event.entitlements).some((entitlement: any) => 
                                entitlement.product_identifier === 'pro' && 
                                new Date(entitlement.expires_date) > new Date()
                              );

    console.log('Has pro entitlement:', hasProEntitlement);

    // Update user's entitlement in profiles table
    const newEntitlement = hasProEntitlement ? 'pro' : 'free';
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        current_entitlement: newEntitlement,
        revenuecat_id: event.app_user_id 
      })
      .eq('id', event.app_user_id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Updated user ${event.app_user_id} entitlement to ${newEntitlement}`);

    // Handle subscription state changes
    if (hasProEntitlement) {
      // User upgraded to pro - unarchive system-archived goals
      console.log('Unarchiving system goals for user');
      const { error: unarchiveError } = await supabaseAdmin
        .rpc('unarchive_system_goals_for_user', { p_user_id: event.app_user_id });

      if (unarchiveError) {
        console.error('Error unarchiving goals:', unarchiveError);
      }
    } else {
      // User lost pro access - archive excess goals
      console.log('Archiving excess goals for user');
      const { error: archiveError } = await supabaseAdmin
        .rpc('archive_excess_goals_for_user', { p_user_id: event.app_user_id });

      if (archiveError) {
        console.error('Error archiving goals:', archiveError);
      }
    }

    console.log('Webhook processed successfully');
    
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});