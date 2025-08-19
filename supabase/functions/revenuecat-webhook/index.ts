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
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${requestId}] ==> WEBHOOK REQUEST START`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] User-Agent: ${req.headers.get('user-agent') || 'Unknown'}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight request - responding with headers`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] Processing RevenueCat webhook...`);
    
    // Log all headers for debugging
    console.log(`[${requestId}] REQUEST HEADERS:`);
    req.headers.forEach((value, key) => {
      // Don't log sensitive headers completely, just indicate presence
      if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('secret')) {
        console.log(`[${requestId}]   ${key}: [REDACTED - ${value.length} chars]`);
      } else {
        console.log(`[${requestId}]   ${key}: ${value}`);
      }
    });
    
    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get('revenuecat-signature');
    const contentType = req.headers.get('content-type');
    
    console.log(`[${requestId}] Body length: ${body.length} bytes`);
    console.log(`[${requestId}] Content-Type: ${contentType || 'Not specified'}`);
    console.log(`[${requestId}] Signature header: ${signature ? `Present (${signature.substring(0, 16)}...)` : 'MISSING'}`);
    console.log(`[${requestId}] Raw body preview: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);

    // Environment check
    console.log(`[${requestId}] REVENUECAT_WEBHOOK_SECRET configured: ${REVENUECAT_WEBHOOK_SECRET ? 'YES' : 'NO'}`);

    // Detect test events and development scenarios
    const isTestEvent = body.includes('"type":"TEST"') || 
                       body.includes('test') || 
                       req.headers.get('user-agent')?.includes('insomnia') ||
                       req.headers.get('user-agent')?.includes('postman') ||
                       req.headers.get('x-test-event') === 'true';
    
    console.log(`[${requestId}] 🧪 TEST EVENT DETECTED: ${isTestEvent ? 'YES' : 'NO'}`);
    
    // Handle signature verification
    if (!signature) {
      if (isTestEvent) {
        console.warn(`[${requestId}] ⚠️ TEST EVENT - Skipping signature verification`);
        console.warn(`[${requestId}] 🚨 WARNING: This should NOT happen in production!`);
      } else {
        console.error(`[${requestId}] ❌ SIGNATURE MISSING - RevenueCat signature header not found`);
        return new Response('Unauthorized: Missing signature', { 
          status: 401, 
          headers: corsHeaders 
        });
      }
    } else {
      const cleanSignature = signature.replace('sha256=', '');
      console.log(`[${requestId}] Cleaned signature: ${cleanSignature.substring(0, 16)}...`);
      
      const signatureValid = await verifyWebhookSignature(body, cleanSignature);
      console.log(`[${requestId}] Signature verification: ${signatureValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (!signatureValid) {
        if (isTestEvent) {
          console.warn(`[${requestId}] ⚠️ TEST EVENT - Invalid signature but allowing through`);
          console.warn(`[${requestId}] 🚨 WARNING: This should NOT happen in production!`);
        } else {
          console.error(`[${requestId}] ❌ SIGNATURE VERIFICATION FAILED`);
          console.error(`[${requestId}] Expected signature format: sha256=<hex>`);
          console.error(`[${requestId}] Received signature: ${signature}`);
          return new Response('Unauthorized: Invalid signature', { 
            status: 401, 
            headers: corsHeaders 
          });
        }
      }
    }

    // Parse and validate JSON
    let event;
    try {
      event = JSON.parse(body);
      console.log(`[${requestId}] ✅ JSON parsed successfully`);
    } catch (parseError) {
      console.error(`[${requestId}] ❌ JSON PARSE ERROR:`, parseError);
      console.error(`[${requestId}] Raw body: ${body}`);
      return new Response('Bad Request: Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Log event details
    console.log(`[${requestId}] EVENT ANALYSIS:`);
    console.log(`[${requestId}]   Type: ${event.type || 'UNKNOWN'}`);
    console.log(`[${requestId}]   App User ID: ${event.app_user_id || 'MISSING'}`);
    console.log(`[${requestId}]   Event Timestamp: ${event.event_timestamp_ms || 'N/A'}`);
    console.log(`[${requestId}]   Environment: ${event.environment || 'N/A'}`);
    console.log(`[${requestId}]   Is Test Event: ${isTestEvent ? 'YES' : 'NO'}`);
    
    // Log full event structure for debugging
    console.log(`[${requestId}] FULL EVENT STRUCTURE:`, JSON.stringify(event, null, 2));

    if (!event.app_user_id) {
      console.error(`[${requestId}] ❌ MISSING app_user_id in webhook event`);
      console.error(`[${requestId}] Available event keys:`, Object.keys(event));
      
      if (isTestEvent) {
        console.warn(`[${requestId}] ⚠️ TEST EVENT - Using dummy user ID for testing`);
        event.app_user_id = 'test-user-' + Date.now();
        console.warn(`[${requestId}] 🧪 Using test user ID: ${event.app_user_id}`);
      } else {
        return new Response('Bad Request: Missing app_user_id', { 
          status: 400, 
          headers: corsHeaders 
        });
      }
    }

    // Detailed entitlement analysis
    console.log(`[${requestId}] ENTITLEMENT ANALYSIS:`);
    if (!event.entitlements) {
      console.log(`[${requestId}]   No entitlements object found`);
    } else {
      console.log(`[${requestId}]   Entitlements found: ${Object.keys(event.entitlements).length}`);
      Object.entries(event.entitlements).forEach(([key, entitlement]: [string, any]) => {
        console.log(`[${requestId}]   Entitlement "${key}":`);
        console.log(`[${requestId}]     Product ID: ${entitlement.product_identifier || 'N/A'}`);
        console.log(`[${requestId}]     Expires: ${entitlement.expires_date || 'N/A'}`);
        console.log(`[${requestId}]     Is Active: ${entitlement.expires_date ? new Date(entitlement.expires_date) > new Date() : 'N/A'}`);
      });
    }

    // Determine if user has pro entitlement with detailed logging
    const hasProEntitlement = event.entitlements && 
                              Object.values(event.entitlements).some((entitlement: any) => {
                                const isPro = entitlement.product_identifier === 'pro';
                                const isActive = entitlement.expires_date && new Date(entitlement.expires_date) > new Date();
                                console.log(`[${requestId}]   Checking entitlement: product=${entitlement.product_identifier}, isPro=${isPro}, isActive=${isActive}`);
                                return isPro && isActive;
                              });

    console.log(`[${requestId}] 🏆 PRO ENTITLEMENT STATUS: ${hasProEntitlement ? '✅ ACTIVE' : '❌ INACTIVE'}`);

    // Database update with detailed logging
    const newEntitlement = hasProEntitlement ? 'pro' : 'free';
    console.log(`[${requestId}] 💾 UPDATING DATABASE: ${event.app_user_id} -> ${newEntitlement}`);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        current_entitlement: newEntitlement,
        revenuecat_id: event.app_user_id 
      })
      .eq('id', event.app_user_id);

    if (profileError) {
      console.error(`[${requestId}] ❌ DATABASE UPDATE ERROR:`, profileError);
      console.error(`[${requestId}] Error details:`, {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      });
      return new Response('Internal Server Error: Database update failed', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`[${requestId}] ✅ Database updated successfully: ${event.app_user_id} -> ${newEntitlement}`);

    // Handle subscription state changes with detailed logging
    console.log(`[${requestId}] 🎯 GOAL MANAGEMENT:`);
    if (hasProEntitlement) {
      console.log(`[${requestId}]   User upgraded to PRO - unarchiving system goals`);
      const { error: unarchiveError } = await supabaseAdmin
        .rpc('unarchive_system_goals_for_user', { p_user_id: event.app_user_id });

      if (unarchiveError) {
        console.error(`[${requestId}]   ❌ Error unarchiving goals:`, unarchiveError);
      } else {
        console.log(`[${requestId}]   ✅ System goals unarchived successfully`);
      }
    } else {
      console.log(`[${requestId}]   User downgraded to FREE - archiving excess goals`);
      const { error: archiveError } = await supabaseAdmin
        .rpc('archive_excess_goals_for_user', { p_user_id: event.app_user_id });

      if (archiveError) {
        console.error(`[${requestId}]   ❌ Error archiving goals:`, archiveError);
      } else {
        console.log(`[${requestId}]   ✅ Excess goals archived successfully`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] ✅ WEBHOOK PROCESSED SUCCESSFULLY`);
    console.log(`[${requestId}] Processing time: ${processingTime}ms`);
    console.log(`[${requestId}] <== WEBHOOK REQUEST END`);
    
    return new Response('OK', { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'X-Processing-Time': `${processingTime}ms`,
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ CRITICAL ERROR in webhook processing:`, error);
    console.error(`[${requestId}] Error name: ${error.name}`);
    console.error(`[${requestId}] Error message: ${error.message}`);
    console.error(`[${requestId}] Error stack: ${error.stack}`);
    console.error(`[${requestId}] Processing time before error: ${processingTime}ms`);
    console.error(`[${requestId}] <== WEBHOOK REQUEST FAILED`);
    
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: {
        ...corsHeaders,
        'X-Processing-Time': `${processingTime}ms`,
        'X-Request-ID': requestId,
        'X-Error': 'true'
      }
    });
  }
});