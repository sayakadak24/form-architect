
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class WorkbookClient {
  private accessToken: string;
  private itemId: string | null = null;

  constructor(private config: any, private url: string) {
    // Extract the access token from the config
    const accessTokenKey = Object.keys(config.AccessToken)[0];
    this.accessToken = config.AccessToken[accessTokenKey].secret;
  }

  async initialize() {
    // Extract file ID from SharePoint URL
    const fileIdMatch = this.url.match(/sourcedoc=%7B([^}]+)%7D/);
    if (!fileIdMatch) {
      throw new Error('Invalid Excel file URL format');
    }
    this.itemId = fileIdMatch[1];

    // Verify token is still valid
    const expiresOn = parseInt(Object.values(this.config.AccessToken)[0].expires_on);
    if (Date.now() / 1000 >= expiresOn) {
      throw new Error('Access token has expired. Please refresh your authentication.');
    }
  }

  async writeData(sheetName: string, data: Record<string, any>) {
    if (!this.accessToken || !this.itemId) {
      throw new Error('Client not initialized');
    }

    const worksheetData = Object.entries(data).map(([key, value]) => [key, String(value)]);
    
    const graphEndpoint = `https://graph.microsoft.com/v1.0/drive/items/${this.itemId}/workbook/worksheets/${sheetName}/range(address='A:B')`;
    
    const response = await fetch(graphEndpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
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
}

serve(async (req) => {
  console.log('Function called with method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received request body:', body);
    
    const { formData, formId } = body;
    
    if (!formId) {
      throw new Error('Form ID is required');
    }

    console.log('Initializing Supabase client...');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, verify that the form exists and get all its data
    console.log('Fetching form details for formId:', formId);
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      console.error('Error fetching form:', formError);
      throw new Error(formError?.message || 'Form not found');
    }

    if (!form.user_id) {
      console.error('Form has no associated user_id');
      throw new Error('Form has no associated user_id');
    }

    console.log('Form found:', form);

    // Get the config file from storage
    const configPath = `${form.user_id}/config.json`;
    console.log('Attempting to download config file from path:', configPath);
    
    const { data: configFile, error: configError } = await supabaseAdmin
      .storage
      .from('configs')
      .download(configPath);

    if (configError || !configFile) {
      console.error('Error downloading config file:', configError);
      throw new Error('Config file not found');
    }

    console.log('Config file downloaded successfully');
    const configText = await configFile.text();
    console.log('Config file contents:', configText);
    
    const config = JSON.parse(configText);
    console.log('Parsed config:', config);

    // If we have an Excel URL, update the Excel file
    if (form.excel_url) {
      console.log('Initializing WorkbookClient...');
      const wb = new WorkbookClient(config, form.excel_url);
      
      console.log('Initializing workbook connection...');
      await wb.initialize();
      
      console.log('Writing data to Excel...');
      await wb.writeData('Sheet1', formData);
      console.log('Excel file updated successfully');
    }

    // Save form response
    console.log('Saving form response...');
    const { error: responseError } = await supabaseAdmin
      .from('form_responses')
      .insert({
        form_id: formId,
        responses: formData
      });

    if (responseError) {
      console.error('Error saving form response:', responseError);
      throw responseError;
    }

    console.log('Form response saved successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Form response saved successfully',
        excelUpdated: !!form.excel_url
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing form submission:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
