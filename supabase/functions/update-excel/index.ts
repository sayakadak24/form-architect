import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
const MICROSOFT_TENANT_ID = "04ec3963-dddc-45fb-afb7-85fa38e19b99"; // OYO tenant ID
const MICROSOFT_AUTH_ENDPOINT = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

// Token cache (in memory). In production, persist this cache.
let tokenCache: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number;
} = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
};

class WorkbookClient {
  private accessToken: string;
  private itemId: string | null = null;
  private driveId: string | null = null;
  private resourcePath: string | null = null;

  constructor(private config: any, private url: string) {
    // Extract the access token from the config
    const accessTokenKey = Object.keys(config.AccessToken)[0];
    this.accessToken = config.AccessToken[accessTokenKey].secret;
    // If available, extract the refresh token and store in our token cache
    if (config.RefreshToken) {
      const refreshTokenKey = Object.keys(config.RefreshToken)[0];
      if (config.RefreshToken[refreshTokenKey].secret) {
        tokenCache.refreshToken = config.RefreshToken[refreshTokenKey].secret;
      }
    }
    // Populate cache with the access token from config (if valid)
    tokenCache.accessToken = this.accessToken;
    // Here we assume the expires_on field exists in config (as a UNIX timestamp)
    if (config.AccessToken[accessTokenKey].expires_on) {
      tokenCache.expiresAt = parseInt(config.AccessToken[accessTokenKey].expires_on) * 1000;
    }
  }

  async initialize() {
    console.log("Initializing WorkbookClient with URL:", this.url);
    try {
      // Acquire a valid token (either cached, refreshed, or new)
      await this.refreshAccessToken();
      console.log("Access token obtained successfully");

      // Process the Excel URL for Microsoft Graph API
      await this.processExcelUrl();
      console.log("Excel URL processed successfully");
      return true;
    } catch (error) {
      console.error("Error during initialization:", error);
      throw error;
    }
  }

  async refreshAccessToken() {
    const now = Date.now();

    // Use cached token if valid
    if (tokenCache.accessToken && tokenCache.expiresAt > now) {
      console.log("Using cached access token");
      this.accessToken = tokenCache.accessToken;
      return;
    }

    // If refresh token is available, attempt silent token acquisition
    if (tokenCache.refreshToken) {
      console.log("Attempting silent token acquisition using refresh token");
      try {
        const response = await fetch(MICROSOFT_AUTH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: MICROSOFT_CLIENT_ID ?? "",
            scope: "https://graph.microsoft.com/.default",
            grant_type: "refresh_token",
            refresh_token: tokenCache.refreshToken,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Refresh token acquisition failed:", response.status, errorText);
          // Fall through to client credentials flow if refresh fails
        } else {
          const data = await response.json();
          tokenCache.accessToken = data.access_token;
          // Update refresh token if provided; otherwise keep the existing one.
          tokenCache.refreshToken = data.refresh_token || tokenCache.refreshToken;
          tokenCache.expiresAt = now + data.expires_in * 1000 - 300000; // expire 5 minutes early
          this.accessToken = data.access_token;
          console.log("Access token refreshed silently using refresh token");
          return;
        }
      } catch (error) {
        console.error("Error during silent token acquisition:", error);
      }
    }

    // Fallback: use client credentials flow (non-interactive)
    console.log("Falling back to client credentials flow to acquire a new token");
    try {
      const response = await fetch(MICROSOFT_AUTH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID ?? "",
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token acquisition via client credentials failed:", response.status, errorText);
        throw new Error(`Failed to acquire access token: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      tokenCache.accessToken = data.access_token;
      tokenCache.expiresAt = now + data.expires_in * 1000 - 300000;
      this.accessToken = data.access_token;
      console.log("New access token acquired using client credentials flow");
    } catch (error) {
      console.error("Error acquiring token via client credentials flow:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  async processExcelUrl() {
    try {
      // Convert the sharing URL to a base64 encoded string per Microsoft guidelines
      const encodedUrl = this.encodeShareUrl(this.url);
      console.log("Encoded share URL:", encodedUrl);

      // Get the drive item information
      const graphEndpoint = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem`;
      console.log("Requesting drive item from:", graphEndpoint);

      const response = await fetch(graphEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error getting drive item:", JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to get drive item: ${errorData.error?.message || "Unknown error"}`);
      }

      const driveItem = await response.json();
      console.log("Drive item response:", JSON.stringify(driveItem, null, 2));

      // Extract drive ID and item ID
      const { parentReference, id } = driveItem;
      this.driveId = parentReference?.driveId;
      this.itemId = id;

      if (!this.driveId || !this.itemId) {
        throw new Error("Excel Share URL or DriveItem is invalid - missing driveId or itemId");
      }

      console.log(`DriveId: ${this.driveId}, ItemId: ${this.itemId}`);

      // Construct resource path
      this.resourcePath = `/drives/${this.driveId}/items/${this.itemId}/workbook`;
      console.log("Resource path:", this.resourcePath);
    } catch (error) {
      console.error("Error processing Excel URL:", error);
      throw error;
    }
  }

  private encodeShareUrl(url: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const base64Url = btoa(String.fromCharCode(...data));
    let encodedUrl = base64Url.replace(/=/g, "").replace(/\//g, "_").replace(/\+/g, "-");
    encodedUrl = "u!" + encodedUrl;
    return encodedUrl;
  }

  async writeData(sheetName: string, data: Record<string, any>) {
    if (!this.accessToken || !this.itemId || !this.driveId) {
      throw new Error("Client not initialized");
    }

    try {
      // Ensure token is still valid before writing
      await this.refreshAccessToken();

      const worksheetData = Object.entries(data).map(([key, value]) => [key, String(value)]);
      const rowCount = worksheetData.length;
      if (rowCount === 0) {
        console.log("No data to write");
        return { success: true, message: "No data to write" };
      }

      const rangeAddress = `A1:B${rowCount}`;
      console.log(`Using range address: ${rangeAddress} for ${rowCount} rows of data`);

      const graphEndpoint = `https://graph.microsoft.com/v1.0${this.resourcePath}/worksheets/${sheetName}/range(address='${rangeAddress}')`;
      console.log("Attempting to write to Excel. Endpoint:", graphEndpoint);
      console.log("Data to write:", JSON.stringify(worksheetData, null, 2));

      const requestBody = { values: worksheetData };

      const response = await fetch(graphEndpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Excel API Error Response:", JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to update Excel file: ${errorData.error?.message || "Unknown error"}`);
      }

      const responseData = await response.json();
      console.log("Excel write operation successful:", JSON.stringify(responseData, null, 2));
      return responseData;
    } catch (error) {
      console.error("Error during Excel write operation:", error);
      throw error;
    }
  }

  async readData(sheetName: string, rangeAddress?: string) {
    if (!this.accessToken || !this.itemId || !this.driveId) {
      throw new Error("Client not initialized");
    }

    let endpoint: string;
    if (!rangeAddress) {
      endpoint = `https://graph.microsoft.com/v1.0${this.resourcePath}/worksheets/${sheetName}/usedRange`;
    } else {
      endpoint = `https://graph.microsoft.com/v1.0${this.resourcePath}/worksheets/${sheetName}/range(address='${rangeAddress}')`;
    }

    console.log("Reading data from Excel. Endpoint:", endpoint);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Excel API Error Response:", JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to read Excel file: ${errorData.error?.message || "Unknown error"}`);
      }

      const data = await response.json();
      console.log("Read data from Excel:", JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error("Error during Excel read operation:", error);
      throw error;
    }
  }
}

serve(async (req) => {
  console.log("Function called with method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", body);

    const { formData, formId } = body;

    if (!formId) {
      throw new Error("Form ID is required");
    }

    console.log("Initializing Supabase client...");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching form details for formId:", formId);
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("*")
      .eq("id", formId)
      .single();

    if (formError || !form) {
      console.error("Error fetching form:", formError);
      throw new Error(formError?.message || "Form not found");
    }

    if (!form.user_id) {
      console.error("Form has no associated user_id");
      throw new Error("Form has no associated user_id");
    }

    console.log("Form found:", form);

    const configPath = `${form.user_id}/config.json`;
    console.log("Attempting to download config file from path:", configPath);

    const { data: configFile, error: configError } = await supabaseAdmin.storage
      .from("configs")
      .download(configPath);

    if (configError || !configFile) {
      console.error("Error downloading config file:", configError);
      throw new Error("Config file not found");
    }

    console.log("Config file downloaded successfully");
    const configText = await configFile.text();
    console.log("Config file contents:", configText);

    const config = JSON.parse(configText);
    console.log("Parsed config:", config);

    if (form.excel_url) {
      console.log("Initializing WorkbookClient...");
      const wb = new WorkbookClient(config, form.excel_url);

      console.log("Initializing workbook connection...");
      await wb.initialize();

      // For debugging, attempt to read current Excel data
      try {
        console.log("Reading current Excel data for debugging...");
        const currentData = await wb.readData("Sheet1");
        console.log("Current Excel data:", currentData);
      } catch (readError) {
        console.error("Error reading current Excel data (non-fatal):", readError);
      }

      console.log("Writing data to Excel...");
      await wb.writeData("Sheet1", formData);
      console.log("Excel file updated successfully");
    }

    console.log("Saving form response...");
    const { error: responseError } = await supabaseAdmin
      .from("form_responses")
      .insert({
        form_id: formId,
        responses: formData,
      });

    if (responseError) {
      console.error("Error saving form response:", responseError);
      throw responseError;
    }

    console.log("Form response saved successfully");

    return new Response(
      JSON.stringify({
        message: "Form response saved successfully",
        excelUpdated: !!form.excel_url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing form submission:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Check the function logs for more information",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
