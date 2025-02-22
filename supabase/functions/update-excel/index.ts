
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99";
const CLIENT_ID = "7c8cca7c-7351-4d57-b94d-18e2ba1e4e24";
const MICROSOFT_LOGIN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getCachedToken(): Promise<string | null> {
  const { data: cache, error } = await supabaseAdmin
    .from('azure_token_cache')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .single();

  if (error || !cache || new Date(cache.expires_at) <= new Date()) {
    return null;
  }

  return cache.cache_data.access_token;
}

async function cacheToken(tokenData: any): Promise<void> {
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  
  await supabaseAdmin
    .from('azure_token_cache')
    .upsert({
      tenant_id: TENANT_ID,
      cache_data: tokenData,
      expires_at: expiresAt.toISOString()
    }, {
      onConflict: 'tenant_id'
    });
}

async function getAccessToken(): Promise<string> {
  // Try to get cached token first
  const cachedToken = await getCachedToken();
  if (cachedToken) {
    console.log('Using cached token');
    return cachedToken;
  }

  console.log('No valid cached token found, initiating device code flow...');
  
  const deviceCodeResponse = await fetch(`${MICROSOFT_LOGIN_URL}/devicecode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  const deviceCodeData = await deviceCodeResponse.json();
  console.log('User authentication required:');
  console.log(deviceCodeData.message);

  // Poll for token
  const pollInterval = deviceCodeData.interval || 5;
  const expiresIn = deviceCodeData.expires_in || 900;
  const startTime = Date.now();

  while (Date.now() - startTime < expiresIn * 1000) {
    const tokenResponse = await fetch(`${MICROSOFT_LOGIN_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'device_code',
        client_id: CLIENT_ID,
        device_code: deviceCodeData.device_code,
      }),
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      
      // Cache the token
      await cacheToken(tokenData);
      
      return tokenData.access_token;
    }

    // Wait for the specified interval before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
  }

  throw new Error('Authentication timeout or user declined.');
}

async function updateExcelFile(accessToken: string, fileId: string, formData: Record<string, any>) {
  const graphEndpoint = `https://graph.microsoft.com/v1.0/drive/items/${fileId}/workbook/worksheets/Sheet1/range(address='A:B')`;
  
  const worksheetData = Object.entries(formData).map(([key, value]) => [key, String(value)]);
  
  const response = await fetch(graphEndpoint, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: worksheetData
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update Excel file: ${error.message}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { formData, excelFileUrl } = await req.json();

    // Extract the file ID from the SharePoint URL
    const fileIdMatch = excelFileUrl.match(/sourcedoc=%7B([^}]+)%7D/);
    if (!fileIdMatch) {
      throw new Error('Invalid Excel file URL format');
    }
    const fileId = fileIdMatch[1];

    console.log('Getting access token...');
    const accessToken = await getAccessToken();

    console.log('Updating Excel file:', fileId);
    console.log('Form data:', formData);

    await updateExcelFile(accessToken, fileId, formData);

    console.log('Excel file updated successfully');

    return new Response(
      JSON.stringify({
        message: 'Excel file updated successfully',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
