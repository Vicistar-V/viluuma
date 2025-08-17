import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevenueCatCustomerInfo {
  request_date: string;
  request_date_ms: number;
  subscriber: {
    entitlements: Record<string, any>;
    first_seen: string;
    last_seen: string;
    management_url: string | null;
    non_subscriptions: Record<string, any>;
    original_app_user_id: string;
    original_application_version: string | null;
    original_purchase_date: string | null;
    subscriptions: Record<string, any>;
    subscriber_attributes: Record<string, any>;
  };
}

function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBSCRIPTION] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Verification request received");

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

    // Call RevenueCat REST API to get current subscription status
    const revenueCatUrl = `https://api.revenuecat.com/v1/subscribers/${appUserId}`;
    const response = await fetch(revenueCatUrl, {
      headers: {
        'Authorization': `Bearer ${revenueCatApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    let subscriptionStatus = "free";
    let currentPeriodEnd: string | null = null;
    let hasActiveEntitlements = false;

    if (response.ok) {
      const customerInfo: RevenueCatCustomerInfo = await response.json();
      logStep("RevenueCat data fetched", { 
        hasEntitlements: Object.keys(customerInfo.subscriber.entitlements).length > 0 
      });

      // Check for active entitlements
      const activeEntitlements = customerInfo.subscriber.entitlements;
      for (const [entitlementId, entitlement] of Object.entries(activeEntitlements)) {
        if (entitlement.expires_date === null || new Date(entitlement.expires_date) > new Date()) {
          hasActiveEntitlements = true;
          if (entitlement.expires_date) {
            currentPeriodEnd = entitlement.expires_date;
          }
          break;
        }
      }

      if (hasActiveEntitlements) {
        subscriptionStatus = "active";
        logStep("Active subscription found", { expiresAt: currentPeriodEnd });
      }
    } else if (response.status === 404) {
      // User not found in RevenueCat - check trial status
      logStep("User not found in RevenueCat, checking trial status");
    } else {
      logStep("RevenueCat API error", { status: response.status });
    }

    // If no active subscription, check trial status from database
    if (!hasActiveEntitlements) {
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('signed_up_at')
        .eq('id', appUserId)
        .single();

      if (profileError) {
        logStep("Failed to fetch profile", { error: profileError });
        throw new Error("Failed to fetch user profile");
      }

      if (profileData?.signed_up_at) {
        const signupDate = new Date(profileData.signed_up_at);
        const trialEndDate = new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now <= trialEndDate) {
          subscriptionStatus = "trial";
          logStep("User in trial period");
        } else {
          subscriptionStatus = "free";
          logStep("User trial expired");
        }
      } else {
        subscriptionStatus = "trial"; // New user
        logStep("New user, starting trial");
      }
    }

    // Update database with verified status
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: subscriptionStatus,
        current_period_ends_at: currentPeriodEnd,
      })
      .eq("id", appUserId);

    if (updateError) {
      logStep("Failed to update subscription status", { error: updateError });
      throw new Error("Failed to update subscription status");
    }

    // Get goal creation permission
    const { data: canCreateGoal, error: canCreateError } = await supabaseClient
      .rpc('can_create_new_goal');

    if (canCreateError) {
      logStep("Failed to check goal creation permission", { error: canCreateError });
      throw new Error("Failed to check goal creation permission");
    }

    // Calculate trial days left
    let trialDaysLeft = null;
    if (subscriptionStatus === 'trial' && profileData?.signed_up_at) {
      const signupDate = new Date(profileData.signed_up_at);
      const trialEndDate = new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const msLeft = trialEndDate.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    }

    logStep("Verification completed", { 
      status: subscriptionStatus, 
      canCreateGoal,
      trialDaysLeft 
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionStatus,
        canCreateGoal,
        trialDaysLeft,
        currentPeriodEnd
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    logStep("Verification error", { error: error.message });
    
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