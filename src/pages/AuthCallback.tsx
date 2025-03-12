
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error("Auth error:", error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || 'Authentication failed');
          return;
        }

        if (!code) {
          console.error("No authorization code received");
          setStatus('error');
          setErrorMessage('No authorization code received');
          return;
        }

        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("No authenticated user");
          setStatus('error');
          setErrorMessage('You must be logged in to connect your Microsoft account');
          return;
        }

        // Exchange the code for tokens
        const redirectUri = `${window.location.origin}/auth-callback`;
        const tokenResponse = await exchangeCodeForTokens(code, redirectUri);

        if (tokenResponse.error) {
          console.error("Token exchange failed:", tokenResponse.error);
          setStatus('error');
          setErrorMessage(tokenResponse.error_description || 'Failed to get access token');
          return;
        }

        // Store tokens in database
        const expiresInMs = tokenResponse.expires_in * 1000;
        const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

        const { error: upsertError } = await supabase
          .from('user_tokens')
          .upsert({
            user_id: session.user.id,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: expiresAt
          });

        if (upsertError) {
          console.error("Failed to store tokens:", upsertError);
          setStatus('error');
          setErrorMessage('Failed to store authentication tokens');
          return;
        }

        setStatus('success');
        
        // Redirect back to the page the user was on
        const redirectTo = localStorage.getItem('auth_redirect') || '/';
        setTimeout(() => {
          navigate(redirectTo);
        }, 2000);
        
      } catch (error) {
        console.error("Unexpected error during callback handling:", error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [navigate]);

  const exchangeCodeForTokens = async (code: string, redirectUri: string) => {
    const TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99";
    const CLIENT_ID = "7c8cca7c-7351-4d57-b94d-18e2ba1e4e24";

    const formData = new URLSearchParams();
    formData.append("client_id", CLIENT_ID);
    formData.append("code", code);
    formData.append("redirect_uri", redirectUri);
    formData.append("grant_type", "authorization_code");
    formData.append("scope", "https://graph.microsoft.com/.default offline_access");

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

    return await response.json();
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">Processing Authentication</h1>
            <p className="text-gray-500 mb-4">Please wait while we complete the authentication process...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">Authentication Successful</h1>
            <p className="text-gray-500 mb-4">Your Microsoft account has been connected successfully.</p>
            <p className="text-gray-500 mb-4">Redirecting you back...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">Authentication Failed</h1>
            <p className="text-red-500 mb-4">{errorMessage}</p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;
