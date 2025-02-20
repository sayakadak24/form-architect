
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DeviceCodeCredential } from "https://deno.land/x/azure_identity@1.1.0/mod.ts";
import { Client } from "https://deno.land/x/microsoft_graph@1.0.1/client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99";
const CLIENT_ID = "7c8cca7c-7351-4d57-b94d-18e2ba1e4e24";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { formData, excelFileUrl } = await req.json();

    console.log('Initializing Azure credentials with Device Code Flow...');
    
    // Initialize Device Code Flow credentials
    const credential = new DeviceCodeCredential({
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      userPromptCallback: (deviceCodeInfo) => {
        console.log('User authentication required:');
        console.log(deviceCodeInfo.message);
      }
    });

    console.log('Creating Microsoft Graph client...');
    
    // Create Microsoft Graph client with device code flow
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
