
import { supabase } from "@/integrations/supabase/client";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface UserToken {
  id?: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

const TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99";
const CLIENT_ID = "7c8cca7c-7351-4d57-b94d-18e2ba1e4e24";

/**
 * Attempts to refresh a Microsoft access token
 * @param refreshToken The refresh token to use
 * @returns A promise with the token response
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<TokenResponse> {
  try {
    console.log("Attempting to refresh Microsoft token");
    
    const formData = new URLSearchParams();
    formData.append("client_id", CLIENT_ID);
    formData.append("refresh_token", refreshToken);
    formData.append("grant_type", "refresh_token");
    formData.append("scope", "https://graph.microsoft.com/.default");
    
    const response = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error("Token refresh failed:", data.error, data.error_description);
      return data as TokenResponse;
    }
    
    console.log("Token refresh successful");
    return data as TokenResponse;
  } catch (error) {
    console.error("Unexpected error during token refresh:", error);
    return {
      error: "unexpected_error",
      error_description: error instanceof Error ? error.message : "Unknown error",
      access_token: "",
      expires_in: 0
    };
  }
}

/**
 * Triggers an interactive login flow by redirecting the user to Microsoft's login page
 */
export function initiateInteractiveLogin() {
  const redirectUri = `${window.location.origin}/auth-callback`;
  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('https://graph.microsoft.com/.default offline_access')}&prompt=consent`;
  
  // Store the current location so we can redirect back after authentication
  localStorage.setItem('auth_redirect', window.location.pathname);
  
  // Redirect to Microsoft login
  window.location.href = authUrl;
}

/**
 * Checks if the user has a valid Microsoft token
 * If not, attempts to refresh it
 * @returns Promise resolving to a boolean indicating if a valid token is available
 */
export async function ensureValidToken(): Promise<boolean> {
  try {
    // Check if user is authenticated with Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("No Supabase session available");
      return false;
    }
    
    // Get Microsoft token from user's metadata or other storage
    const { data: userToken, error: userError } = await supabase
      .from('user_tokens')
      .select('refresh_token, expires_at, access_token')
      .eq('user_id', session.user.id)
      .maybeSingle();
      
    if (userError || !userToken) {
      console.log("No Microsoft token available:", userError?.message);
      return false;
    }
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(userToken.expires_at);
    
    if (expiresAt > now) {
      console.log("Microsoft token still valid");
      return true;
    }
    
    // Token is expired, attempt to refresh
    console.log("Microsoft token expired, attempting refresh");
    const refreshResult = await refreshMicrosoftToken(userToken.refresh_token);
    
    if (refreshResult.error) {
      if (refreshResult.error === "invalid_grant" && 
          refreshResult.error_description?.includes("consent_required")) {
        console.log("Consent required, initiating interactive login");
        initiateInteractiveLogin();
        return false;
      }
      
      console.error("Failed to refresh token:", refreshResult.error);
      return false;
    }
    
    // Update tokens in database
    const expiresInMs = refreshResult.expires_in * 1000;
    const newExpiresAt = new Date(Date.now() + expiresInMs);
    
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        access_token: refreshResult.access_token,
        refresh_token: refreshResult.refresh_token || userToken.refresh_token,
        expires_at: newExpiresAt.toISOString()
      })
      .eq('user_id', session.user.id);
      
    if (updateError) {
      console.error("Failed to update tokens:", updateError);
      return false;
    }
    
    console.log("Microsoft token refreshed and updated successfully");
    return true;
  } catch (error) {
    console.error("Error ensuring valid token:", error);
    return false;
  }
}
