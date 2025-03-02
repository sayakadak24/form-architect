
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData, validationQuery } = await req.json();
    
    console.log('Validation request received for data:', JSON.stringify(formData));
    console.log('Using validation query:', validationQuery);
    
    // This is where you'd implement the actual validation logic
    // For this example, we're implementing a simple simulation of validation
    
    // In a real implementation, you might:
    // 1. Connect to BigQuery or another data source
    // 2. Run the validation query against each field that needs validation
    // 3. Return the results
    
    // For demonstration, we'll simulate a validation process
    const validationResults: Record<string, boolean> = {};
    let hasErrors = false;
    
    // Extract field IDs from formData
    const fieldIds = Object.keys(formData);
    
    // Simulated validation (in a real scenario, you'd run the actual query)
    // This is just to demonstrate the flow
    for (const fieldId of fieldIds) {
      const value = formData[fieldId];
      
      // Skip empty values
      if (!value || (Array.isArray(value) && value.length === 0)) {
        continue;
      }
      
      // Simple simulation - in reality, you'd execute the validation query
      // For demo purposes, we'll randomly mark some fields as invalid
      // In a real implementation, this would be based on actual query results
      if (validationQuery && validationQuery.includes('BigQuery') && Math.random() > 0.8) {
        validationResults[fieldId] = false;
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      console.log('Validation failed with errors:', JSON.stringify(validationResults));
      return new Response(
        JSON.stringify({
          success: false,
          validationErrors: validationResults,
          message: "Some fields failed validation."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Validation successful');
    return new Response(
      JSON.stringify({
        success: true,
        message: "All fields validated successfully."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
