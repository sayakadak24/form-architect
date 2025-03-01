
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

    // Removed the token expiration check as requested
  }

  async writeData(sheetName: string, data: Record<string, any>) {
    if (!this.accessToken || !this.itemId) {
      throw new Error('Client not initialized');
    }

    const worksheetData = Object.entries(data).map(([key, value]) => [key, String(value)]);
    
    const graphEndpoint = `https://graph.microsoft.com/v1.0/drive/items/${this.itemId}/workbook/worksheets/${sheetName}/range(address='A:B')`;
    
    console.log(`Attempting to write to Excel. Endpoint: ${graphEndpoint}`);
    console.log(`Data to write:`, JSON.stringify(worksheetData, null, 2));
    
    try {
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
        const errorData = await response.json();
        console.error('Excel API Error Response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to update Excel file: ${errorData.error?.message || 'Unknown error'}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error during Excel write operation:', error);
      throw error;
    }
  }

  // New method to read data from Excel - similar to the Python code provided
  async readData(sheetName: string, rangeAddress?: string) {
    if (!this.accessToken || !this.itemId) {
      throw new Error('Client not initialized');
    }

    // If no range is specified, we'll first get the used range
    let endpoint;
    if (!rangeAddress) {
      endpoint = `https://graph.microsoft.com/v1.0/drive/items/${this.itemId}/workbook/worksheets/${sheetName}/usedRange`;
    } else {
      endpoint = `https://graph.microsoft.com/v1.0/drive/items/${this.itemId}/workbook/worksheets/${sheetName}/range(address='${rangeAddress}')`;
    }

    console.log(`Reading data from Excel. Endpoint: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Excel API Error Response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to read Excel file: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Read data from Excel:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Error during Excel read operation:', error);
      throw error;
    }
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
      
      // Debug: First read the data to see what's currently in the workbook
      try {
        console.log('Reading current Excel data for debugging...');
        const currentData = await wb.readData('Sheet1');
        console.log('Current Excel data:', currentData);
      } catch (readError) {
        console.error('Error reading current Excel data (non-fatal):', readError);
        // Continue even if read fails
      }
      
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
