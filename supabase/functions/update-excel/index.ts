
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for storing access tokens
const tokenCache = new Map();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Excel update function started");

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase URL or key");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { formData, formId } = await req.json();
    
    console.log(`Received form data for form ID: ${formId}`);
    
    // Fetch the form to get the Excel URL and sheet name
    const { data: formDetails, error: formError } = await supabase
      .from('forms')
      .select('excel_url, sheet_name')
      .eq('id', formId)
      .single();
    
    if (formError) {
      throw new Error(`Failed to fetch form details: ${formError.message}`);
    }
    
    if (!formDetails.excel_url) {
      throw new Error("No Excel URL specified for this form");
    }
    
    const excelUrl = formDetails.excel_url;
    const sheetName = formDetails.sheet_name || 'Sheet1';
    
    console.log(`Excel URL: ${excelUrl}`);
    console.log(`Sheet name: ${sheetName}`);
    
    // Parse the Excel URL to extract necessary information
    const urlInfo = parseExcelUrl(excelUrl);
    
    if (!urlInfo) {
      throw new Error("Invalid Excel URL format");
    }
    
    console.log(`Parsed URL info: ${JSON.stringify(urlInfo)}`);
    
    // Get or refresh access token
    const token = await getAccessToken();
    
    console.log("Access token obtained");
    
    // Format the data for Excel
    const formattedData = formatDataForExcel(formData);
    
    console.log(`Formatted data: ${JSON.stringify(formattedData)}`);
    
    // Write data to Excel
    await writeData(urlInfo, formattedData, token, sheetName);
    
    console.log("Data successfully written to Excel");
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Parse the Excel URL to extract drive ID and item ID
function parseExcelUrl(url: string) {
  try {
    console.log(`Parsing URL: ${url}`);
    
    // Handle OneDrive shared URLs
    if (url.includes("1drv.ms") || url.includes("sharepoint.com")) {
      // For shared URLs, we would need to make an additional API call to resolve them
      console.log("Shared URL detected, would need additional resolution");
      throw new Error("Shared OneDrive links are not supported yet");
    }
    
    // Handle direct OneDrive URLs
    if (url.includes("/personal/")) {
      const matches = url.match(/drive\/items\/([^/?]+)/i);
      if (matches && matches[1]) {
        const itemId = matches[1];
        // Simplified, in reality you'd need to also extract the drive ID
        return { driveId: "me", itemId };
      }
    }
    
    // Handle OneDrive for Business URLs
    const driveMatch = url.match(/\/drives\/([^/]+)/i);
    const itemMatch = url.match(/\/items\/([^/?.]+)/i);
    
    if (driveMatch && driveMatch[1] && itemMatch && itemMatch[1]) {
      return {
        driveId: driveMatch[1],
        itemId: itemMatch[1]
      };
    }
    
    throw new Error("Could not parse Excel URL format");
  } catch (error) {
    console.error(`Error parsing Excel URL: ${error.message}`);
    return null;
  }
}

// Format form data into a 2D array for Excel
function formatDataForExcel(formData: Record<string, any>): string[][] {
  try {
    // Convert form data to array format for Excel
    // First row is the headers (field IDs)
    // Second row is the values
    const headers = Object.keys(formData);
    const values = headers.map(key => {
      const value = formData[key];
      // Handle different types of values (arrays, objects, etc.)
      if (Array.isArray(value)) {
        return value.join(", ");
      } else if (value instanceof Date) {
        return value.toISOString();
      } else if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
      }
      return value?.toString() || "";
    });
    
    return [headers, values];
  } catch (error) {
    console.error(`Error formatting data: ${error.message}`);
    throw error;
  }
}

// Get or refresh Microsoft Graph API access token
async function getAccessToken(): Promise<string> {
  try {
    // Check if we have a valid cached token
    const cachedToken = tokenCache.get("msGraphToken");
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      console.log("Using cached token");
      return cachedToken.token;
    }
    
    console.log("Getting new access token");
    
    // In production, you would use proper OAuth flow with MSAL
    // This is a simplified example using client credentials flow
    const tenantId = "common"; // or your specific tenant ID
    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
    
    if (!clientId) {
      throw new Error("Microsoft client ID not configured");
    }
    
    // In a real implementation, you'd use a proper authentication library
    // and implement secure token acquisition and refresh
    
    // Simulate getting a token (in production, you'd make an actual OAuth request)
    const token = "simulated_token_" + Math.random().toString(36).substring(2);
    
    // Cache the token with an expiration time (1 hour)
    tokenCache.set("msGraphToken", {
      token,
      expiresAt: Date.now() + 3600000, // 1 hour
    });
    
    return token;
  } catch (error) {
    console.error(`Error getting access token: ${error.message}`);
    throw error;
  }
}

// Write data to Excel using Microsoft Graph API
async function writeData(
  urlInfo: { driveId: string; itemId: string }, 
  data: string[][], 
  token: string,
  sheetName: string
): Promise<void> {
  try {
    console.log(`Writing data to sheet: ${sheetName}`);
    
    // Calculate the range based on data dimensions
    const rows = data.length;
    const cols = data[0].length;
    const endCol = String.fromCharCode(64 + cols); // Convert column number to letter (e.g., 1 -> A, 2 -> B)
    const range = `A1:${endCol}${rows}`;
    
    console.log(`Using range: ${range}`);
    
    const url = `https://graph.microsoft.com/v1.0/drives/${urlInfo.driveId}/items/${urlInfo.itemId}/workbook/worksheets/${sheetName}/range(address='${range}')`;
    
    console.log(`API URL: ${url}`);
    
    // Prepare the request body
    const body = {
      values: data
    };
    
    // Make the API request
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      
      // Handle token expiration
      if (response.status === 401) {
        // Clear cached token
        tokenCache.delete("msGraphToken");
        throw new Error("Authentication token expired");
      }
      
      throw new Error(`Failed to update Excel file: ${response.status} ${response.statusText}`);
    }
    
    console.log("Excel update successful");
    
  } catch (error) {
    console.error(`Error writing data: ${error.message}`);
    throw error;
  }
}
