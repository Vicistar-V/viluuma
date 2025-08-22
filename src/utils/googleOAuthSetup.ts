import { supabase } from "@/integrations/supabase/client";

export interface GoogleOAuthCredentials {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/**
 * Save Google OAuth credentials to the database
 * This function should be called after completing the OAuth flow
 */
export async function saveGoogleOAuthCredentials(credentials: GoogleOAuthCredentials) {
  try {
    console.log("Saving Google OAuth credentials to database...");
    
    // Calculate expiry date if expires_in is provided
    const expiryDate = credentials.expires_in 
      ? new Date(Date.now() + credentials.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600000).toISOString(); // Default 1 hour

    const { data, error } = await supabase.from('oauth_credentials').upsert({
      service: 'gemini',
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      token_type: credentials.token_type || 'Bearer',
      expiry_date: expiryDate,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'service'
    });

    if (error) {
      console.error("Failed to save OAuth credentials:", error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }

    console.log("Successfully saved Google OAuth credentials");
    return { success: true, data };
  } catch (error) {
    console.error("Error saving Google OAuth credentials:", error);
    throw error;
  }
}

/**
 * Get Google OAuth credentials from the database
 */
export async function getGoogleOAuthCredentials() {
  try {
    console.log("Loading Google OAuth credentials from database...");
    
    const { data, error } = await supabase
      .from('oauth_credentials')
      .select('*')
      .eq('service', 'gemini')
      .single();

    if (error) {
      console.error("Failed to load OAuth credentials:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      console.log("No OAuth credentials found in database");
      return { success: false, error: "No credentials found" };
    }

    console.log("Successfully loaded OAuth credentials from database");
    return { 
      success: true, 
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expiry_date: data.expiry_date,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    };
  } catch (error) {
    console.error("Error loading OAuth credentials:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if Google OAuth credentials exist and are valid
 */
export async function checkGoogleOAuthStatus() {
  try {
    const result = await getGoogleOAuthCredentials();
    
    if (!result.success || !result.data) {
      return { isValid: false, needsSetup: true, message: "No OAuth credentials configured" };
    }

    // Check if token is expired (with 5 minute buffer)
    const expiryTime = new Date(result.data.expiry_date).getTime();
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (expiryTime < currentTime + bufferTime) {
      return { isValid: false, needsRefresh: true, message: "OAuth token expired or expiring soon" };
    }

    return { isValid: true, message: "OAuth credentials are valid" };
  } catch (error) {
    console.error("Error checking OAuth status:", error);
    return { isValid: false, needsSetup: true, message: "Error checking OAuth status" };
  }
}

/**
 * Delete Google OAuth credentials from the database
 */
export async function deleteGoogleOAuthCredentials() {
  try {
    console.log("Deleting Google OAuth credentials from database...");
    
    const { error } = await supabase
      .from('oauth_credentials')
      .delete()
      .eq('service', 'gemini');

    if (error) {
      console.error("Failed to delete OAuth credentials:", error);
      throw new Error(`Failed to delete credentials: ${error.message}`);
    }

    console.log("Successfully deleted Google OAuth credentials");
    return { success: true };
  } catch (error) {
    console.error("Error deleting OAuth credentials:", error);
    throw error;
  }
}