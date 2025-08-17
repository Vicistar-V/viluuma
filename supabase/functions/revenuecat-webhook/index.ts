import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevenueCatWebhookEvent {
  event_type: string;
  app_user_id: string;
  original_app_user_id: string;
  store: string;
  product_id: string;
  entitlement_ids: string[];
  is_family_share: boolean;
  subscriber_attributes: Record<string, any>;
  purchased_at_ms: number;
  expiration_at_ms?: number;
  period_type?: string;
  cancel_reason?: string;
  is_trial_conversion?: boolean;
  environment: string;
}

async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVENUECAT-WEBHOOK] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received", { method: req.method });

    // Get webhook secret
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("REVENUECAT_WEBHOOK_SECRET not configured");
    }

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get("X-Revenuecat-Signature");
    
    if (!signature) {
      throw new Error("Missing X-Revenuecat-Signature header");
    }

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(body, signature, webhookSecret);
    if (!isValidSignature) {
      logStep("Invalid webhook signature");
      throw new Error("Invalid webhook signature");
    }

    logStep("Webhook signature verified");

    // Parse webhook event
    const event: RevenueCatWebhookEvent = JSON.parse(body);
    logStep("Event parsed", { 
      eventType: event.event_type, 
      appUserId: event.app_user_id,
      store: event.store,
      productId: event.product_id 
    });

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Map RevenueCat app_user_id to Supabase user
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", event.app_user_id)
      .single();

    if (profileError) {
      logStep("User not found", { appUserId: event.app_user_id, error: profileError });
      // Return 200 to acknowledge webhook even if user not found
      return new Response(JSON.stringify({ success: true, message: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("User found", { userId: profile.id });

    // Process different event types
    let subscriptionStatus = "free";
    let currentPeriodEnd: string | null = null;

    switch (event.event_type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION":
        subscriptionStatus = "active";
        currentPeriodEnd = event.expiration_at_ms 
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
        logStep("Subscription activated", { 
          status: subscriptionStatus, 
          expiresAt: currentPeriodEnd 
        });
        break;

      case "CANCELLATION":
        subscriptionStatus = "canceled";
        currentPeriodEnd = event.expiration_at_ms 
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
        logStep("Subscription canceled", { expiresAt: currentPeriodEnd });
        break;

      case "EXPIRATION":
        subscriptionStatus = "expired";
        currentPeriodEnd = null;
        logStep("Subscription expired");
        break;

      case "BILLING_ISSUE":
        subscriptionStatus = "canceled";
        logStep("Billing issue detected");
        break;

      default:
        logStep("Unhandled event type", { eventType: event.event_type });
        break;
    }

    // Update user subscription status
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: subscriptionStatus,
        current_period_ends_at: currentPeriodEnd,
        revenuecat_user_id: event.app_user_id,
        revenuecat_subscription_id: event.product_id,
        revenuecat_original_app_user_id: event.original_app_user_id,
      })
      .eq("id", profile.id);

    if (updateError) {
      logStep("Failed to update subscription", { error: updateError });
      throw new Error("Failed to update subscription status");
    }

    logStep("Subscription status updated successfully", { 
      userId: profile.id, 
      status: subscriptionStatus 
    });

    // Handle subscription downgrade (from active to free/expired)
    if (["free", "expired", "canceled"].includes(subscriptionStatus)) {
      try {
        logStep("Handling downgrade - archiving excess goals");
        const { error: archiveError } = await supabaseClient.rpc('archive_excess_goals');
        if (archiveError) {
          logStep("Failed to archive excess goals", { error: archiveError });
        } else {
          logStep("Successfully archived excess goals");
        }
      } catch (error) {
        logStep("Error during goal archiving", { error });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed successfully",
        eventType: event.event_type,
        subscriptionStatus 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    logStep("Webhook processing error", { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});