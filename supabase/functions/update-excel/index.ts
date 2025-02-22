
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99";
const CLIENT_ID = "7c8cca7c-7351-4d57-b94d-18e2ba1e4e24";
const MICROSOFT_LOGIN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;

async function getAccessToken(): Promise<string> {
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
