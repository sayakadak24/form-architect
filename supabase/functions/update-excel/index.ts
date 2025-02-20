
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ClientSecretCredential } from "https://deno.land/x/azure_identity@1.1.0/mod.ts";
import { Client } from "https://deno.land/x/microsoft_graph@1.0.1/client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99";
const CLIENT_ID = "7c8cca7c-7351-4d57-b94d-18e2b1e4e24";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { formData, excelFileUrl } = await req.json();

    // Get client secret from environment variable
    const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');
    if (!clientSecret) {
      throw new Error('Azure client secret not configured');
    }

    console.log('Initializing Azure credentials...');
    
    // Initialize the Azure AD credentials
    const credential = new ClientSecretCredential(
      TENANT_ID,
      CLIENT_ID,
      clientSecret
    );

    console.log('Creating Microsoft Graph client...');
    
    // Create Microsoft Graph client
    const client = new Client(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });

    // Extract the file ID from the SharePoint URL
    const fileIdMatch = excelFileUrl.match(/sourcedoc=%7B([^}]+)%7D/);
    if (!fileIdMatch) {
      throw new Error('Invalid Excel file URL format');
    }
    const fileId = fileIdMatch[1];

    console.log('Preparing to update Excel file:', fileId);
    console.log('Form data:', formData);

    // Convert form data to worksheet format
    const worksheetData = Object.entries(formData).map(([key, value]) => ({
      key,
      value: String(value)
    }));

    // Update Excel file
    // Note: This is a simplified example. You'll need to adjust the exact range and format
    // based on your Excel file structure
    await client.api(`/drive/items/${fileId}/workbook/worksheets/Sheet1/range(address='A:B')`).patch({
      values: worksheetData.map(item => [item.key, item.value])
    });

    console.log('Excel file updated successfully');

    return new Response(
      JSON.stringify({
        message: 'Excel file updated successfully',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
