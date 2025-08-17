import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseRequest {
  fetch_token: string;
  product_id: string;
  platform: 'ios' | 'android' | 'web';
  price?: number;
  currency?: string;
}

function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECORD-PURCHASE] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Purchase recording request received");

    // Get RevenueCat API key
    const revenueCatApiKey = Deno.env.get("REVENUECAT_API_KEY");
    if (!revenueCatApiKey) {
      throw new Error("REVENUECAT_API_KEY not configured");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Authentication failed", { error: authError });
      throw new Error("Authentication required");
    }

    const appUserId = user.id;
    logStep("User authenticated", { userId: appUserId });

    // Parse request body
    const body: PurchaseRequest = await req.json();
    const { fetch_token, product_id, platform, price, currency } = body;

    if (!fetch_token || !product_id || !platform) {
      throw new Error("Missing required fields: fetch_token, product_id, platform");
    }

    logStep("Purchase data received", { 
      productId: product_id, 
      platform,
      hasToken: !!fetch_token 
    });

    // Prepare RevenueCat request payload
    const revenueCatPayload = {
      app_user_id: appUserId,
      fetch_token,
      product_id,
      ...(price && { price }),
      ...(currency && { currency }),
    };

    // Call RevenueCat REST API to record the purchase
    const revenueCatUrl = 'https://api.revenuecat.com/v1/receipts';
    const response = await fetch(revenueCatUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revenueCatApiKey}`,
        'Content-Type': 'application/json',
        'X-Platform': platform,
      },
      body: JSON.stringify(revenueCatPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("RevenueCat API error", { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`RevenueCat API error: ${response.status} - ${errorText}`);
    }

    const purchaseResult = await response.json();
    logStep("Purchase recorded in RevenueCat", { 
      success: true,
      hasSubscriber: !!purchaseResult.subscriber 
    });

    // Extract subscription status from the response
    let subscriptionStatus = "free";
    let currentPeriodEnd: string | null = null;

    if (purchaseResult.subscriber) {
      const entitlements = purchaseResult.subscriber.entitlements || {};
      const hasActiveEntitlements = Object.keys(entitlements).some(entitlementId => {
        const entitlement = entitlements[entitlementId];
        return entitlement.expires_date === null || new Date(entitlement.expires_date) > new Date();
      });

      if (hasActiveEntitlements) {
        subscriptionStatus = "active";
        // Get the latest expiration date
        for (const entitlement of Object.values(entitlements)) {
          if (entitlement.expires_date && (!currentPeriodEnd || entitlement.expires_date > currentPeriodEnd)) {
            currentPeriodEnd = entitlement.expires_date;
          }
        }
      }
    }

    // Update user subscription status in database
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: subscriptionStatus,
        current_period_ends_at: currentPeriodEnd,
        revenuecat_user_id: appUserId,
        revenuecat_subscription_id: product_id,
      })
      .eq("id", appUserId);

    if (updateError) {
      logStep("Failed to update subscription status", { error: updateError });
      throw new Error("Failed to update subscription status");
    }

    logStep("Purchase recorded successfully", { 
      status: subscriptionStatus,
      expiresAt: currentPeriodEnd 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Purchase recorded successfully",
        subscriptionStatus,
        currentPeriodEnd,
        customerInfo: purchaseResult.subscriber
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    logStep("Purchase recording error", { error: error.message });
    
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