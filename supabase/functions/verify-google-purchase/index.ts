import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseVerificationRequest {
  purchaseToken: string;
  productId: string;
  packageName: string;
}

interface GooglePlayPurchaseResponse {
  purchaseTimeMillis: string;
  purchaseState: number;
  consumptionState: number;
  developerPayload: string;
  orderId: string;
  acknowledgmentState: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    // Create Supabase client for user verification
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Parse request body
    const body: PurchaseVerificationRequest = await req.json();
    const { purchaseToken, productId, packageName } = body;

    if (!purchaseToken || !productId || !packageName) {
      throw new Error("Missing required fields: purchaseToken, productId, packageName");
    }

    // NEVER TRUST THE CLIENT - Verify with Google directly
    const googleApiKey = Deno.env.get("GOOGLE_PLAY_API_KEY");
    if (!googleApiKey) {
      throw new Error("Google Play API key not configured");
    }

    // Make server-to-server call to Google Play Developer API
    const googlePlayUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}?access_token=${googleApiKey}`;
    
    const googleResponse = await fetch(googlePlayUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!googleResponse.ok) {
      console.error("Google Play verification failed:", await googleResponse.text());
      throw new Error("Purchase verification failed");
    }

    const purchaseData: GooglePlayPurchaseResponse = await googleResponse.json();

    // Verify purchase is valid (purchaseState: 0 = purchased, 1 = canceled)
    if (purchaseData.purchaseState !== 0) {
      throw new Error("Purchase is not in valid state");
    }

    // Create service role client to update subscription status
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate subscription period (assuming monthly subscription)
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    // Update user's subscription status (bypass RLS with service role)
    const { error: updateError } = await supabaseService
      .from("profiles")
      .update({
        subscription_status: "active",
        provider_subscription_id: purchaseData.orderId,
        current_period_ends_at: currentPeriodEnd.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
      throw new Error("Failed to update subscription status");
    }

    console.log(`Successfully verified purchase for user ${user.id}, order: ${purchaseData.orderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: purchaseData.orderId,
        validUntil: currentPeriodEnd.toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Purchase verification error:", error);
    
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