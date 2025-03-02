
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Constants for Microsoft Graph API
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')
const MICROSOFT_TENANT_ID = '04ec3963-dddc-45fb-afb7-85fa38e19b99' // OYO tenant ID
const MICROSOFT_AUTH_ENDPOINT = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`

// Token storage - in a production scenario, use a more persistent storage solution
let tokenCache = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
}

class WorkbookClient {
  url: string;
  accessToken: string | null;
  resourcePath: string | null;
  drive_id: string | null;
  item_id: string | null;
  drive_item: any;

  constructor(url: string) {
    this.url = url
    this.accessToken = null
    this.resourcePath = null
    this.drive_id = null
    this.item_id = null
    this.drive_item = null
  }

  async initialize() {
    try {
      // Get a fresh token (or use cached if valid)
      await this.refreshAccessToken()
      console.log('Access token obtained successfully')

      // Process the Excel URL for Microsoft Graph API
      await this.processExcelUrl()
      console.log('Excel URL processed successfully')

      return true
    } catch (error) {
      console.error('Failed to initialize WorkbookClient:', error)
      return false
    }
  }

  async refreshAccessToken() {
    const now = Date.now()
    
    // Check if we have a valid token that hasn't expired yet
    if (tokenCache.accessToken && tokenCache.expiresAt > now) {
      console.log('Using cached access token')
      this.accessToken = tokenCache.accessToken
      return
    }

    // We need to acquire a new token
    console.log('Token expired or not available, getting a new one')
    
    try {
      // For a real implementation, this should use refresh tokens or device code flow
      // This is a simplified version that uses client credentials flow
      const response = await fetch(MICROSOFT_AUTH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Token acquisition failed:', response.status, errorText)
        throw new Error(`Failed to acquire access token: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      
      // Update token cache
      tokenCache.accessToken = data.access_token
      tokenCache.expiresAt = now + (data.expires_in * 1000) - 300000 // Expire 5 minutes early to be safe
      
      // Set the current token
      this.accessToken = data.access_token
      console.log('New access token acquired successfully')
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  async processExcelUrl() {
    try {
      // Shared URLs must be converted to the necessary format for Microsoft Graph API
      const urlBytes = new TextEncoder().encode(this.url)
      const urlBase64 = btoa(String.fromCharCode.apply(null, [...new Uint8Array(urlBytes)]))
      
      // Process the base64 string according to Microsoft's requirements
      let encodedUrl = 'u!' + urlBase64.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-')
      
      console.log(`Encoded URL: ${encodedUrl}`)
      
      // Find the Drive and Item IDs for the Excel file
      if (!this.drive_item) {
        const response = await fetch(`https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to get drive item:', response.status, errorText)
          throw new Error(`Failed to get drive item: ${response.status} ${errorText}`)
        }
        
        this.drive_item = await response.json()
      }
      
      // Extract drive ID and item ID
      this.drive_id = this.drive_item.parentReference?.driveId
      this.item_id = this.drive_item.id
      
      if (!this.drive_id || !this.item_id) {
        throw new Error('Excel Share URL or DriveItem is Invalid - missing drive_id or item_id')
      }
      
      console.log(`Drive ID: ${this.drive_id}, Item ID: ${this.item_id}`)
      
      // Construct the API path to the workbook
      this.resourcePath = `/drives/${this.drive_id}/items/${this.item_id}`
      
      return true
    } catch (error) {
      console.error('Error processing Excel URL:', error)
      throw error
    }
  }

  async readData(sheetName = 'Sheet1', range = 'A1:B10') {
    if (!this.accessToken || !this.resourcePath) {
      console.error('Client not initialized properly')
      throw new Error('Client not initialized')
    }

    try {
      console.log('Reading current Excel data for debugging...')
      
      const graphEndpoint = `https://graph.microsoft.com/v1.0${this.resourcePath}/workbook/worksheets/${sheetName}/range(address='${range}')`
      
      console.log(`Reading from endpoint: ${graphEndpoint}`)
      
      const response = await fetch(graphEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Excel read error:', response.status, JSON.stringify(errorData, null, 2))
        throw new Error(`Failed to read Excel data: ${errorData.error?.message || 'Unknown error'}`)
      }

      const responseData = await response.json()
      console.log('Excel data read successfully:', JSON.stringify(responseData, null, 2))
      return responseData
    } catch (error) {
      console.error('Error during Excel read operation:', error)
      throw error
    }
  }

  async writeData(data: Record<string, any>, sheetName = 'Sheet1') {
    if (!this.accessToken || !this.resourcePath) {
      console.error('Client not initialized properly')
      throw new Error('Client not initialized')
    }

    try {
      // Ensure token is still valid before attempting to write
      await this.refreshAccessToken()
      
      // Convert the data object to array format expected by Excel API
      const worksheetData = Object.entries(data).map(([key, value]) => [key, String(value)])
      
      // Get row count to determine exact range to update
      const rowCount = worksheetData.length
      if (rowCount === 0) {
        console.log('No data to write')
        return { success: true, message: 'No data to write' }
      }
      
      // Specify an exact range rather than using A:B (which can cause errors)
      const rangeAddress = `A1:B${rowCount}`
      console.log(`Using range address: ${rangeAddress} for ${rowCount} rows of data`)
      
      const graphEndpoint = `https://graph.microsoft.com/v1.0${this.resourcePath}/workbook/worksheets/${sheetName}/range(address='${rangeAddress}')`
      
      console.log(`Attempting to write to Excel. Endpoint: ${graphEndpoint}`)
      console.log(`Data to write:`, JSON.stringify(worksheetData, null, 2))
      
      // Format the data exactly as required by Microsoft Graph API
      const requestBody = {
        values: worksheetData
      }
      
      const response = await fetch(graphEndpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Excel write error:', response.status, JSON.stringify(errorData, null, 2))
        throw new Error(`Failed to update Excel file: ${errorData.error?.message || 'Unknown error'}`)
      }

      const responseData = await response.json()
      console.log('Excel write operation successful:', JSON.stringify(responseData, null, 2))
      return responseData
    } catch (error) {
      console.error('Error during Excel write operation:', error)
      
      // If error is due to token expiration, try refreshing token and retrying once
      if (error.message && error.message.includes('token')) {
        try {
          console.log('Token error detected, forcing token refresh and retrying...')
          tokenCache.expiresAt = 0 // Force token refresh
          await this.refreshAccessToken()
          return this.writeData(data, sheetName) // Retry with fresh token
        } catch (retryError) {
          console.error('Retry after token refresh also failed:', retryError)
          throw retryError
        }
      }
      
      throw error
    }
  }
}

console.log("Starting update-excel function server...")

serve(async (req) => {
  console.log(`Received ${req.method} request to ${req.url}`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request")
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests for this endpoint
  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`)
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log("Parsing request body...")
    const body = await req.json()
    const { excelUrl, formData } = body

    console.log("Request data:", JSON.stringify({ excelUrl, formDataKeys: formData ? Object.keys(formData) : null }))

    if (!excelUrl) {
      console.log("Excel URL is missing")
      return new Response(JSON.stringify({ error: 'Excel URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize the Excel client
    console.log("Initializing Excel client...")
    const client = new WorkbookClient(excelUrl)
    const initialized = await client.initialize()

    if (!initialized) {
      console.log("Failed to initialize Excel client")
      return new Response(JSON.stringify({ error: 'Failed to initialize Excel client' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Try to read existing data first (for debugging)
    try {
      console.log("Attempting to read existing data...")
      await client.readData()
    } catch (readError) {
      console.error('Warning: Could not read existing data:', readError)
      // Continue with the write operation even if read fails
    }

    // Write the form data to Excel
    console.log("Writing form data to Excel...")
    const result = await client.writeData(formData)

    console.log("Operation completed successfully")
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in update-excel function:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

console.log("update-excel function is now running and waiting for requests.")
