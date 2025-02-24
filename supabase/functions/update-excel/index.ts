
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Client } from "https://deno.land/x/microsoft_graph@1.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData, formId } = await req.json();
    
    if (!formId) {
      throw new Error('Form ID is required');
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get form details and user's config
    const { data: form } = await supabaseAdmin
      .from('forms')
      .select('user_id')
      .eq('id', formId)
      .single();

    if (!form?.user_id) {
      throw new Error('Form owner not found');
    }

    // Get admin user's config file path
    const { data: adminConfig } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', form.user_id)
      .single();

    if (!adminConfig?.id) {
      throw new Error('Admin configuration not found');
    }

    // Download the config file
    const { data: configFile } = await supabaseAdmin
      .storage
      .from('configs')
      .download(`${adminConfig.id}/config.json`);

    if (!configFile) {
      throw new Error('Config file not found');
    }

    const configText = await configFile.text();
    const config = JSON.parse(configText);

    // Save form response
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

    // Use config to update Excel
    // Note: This is where you'll implement the Excel update logic using the config
    console.log('Config loaded:', config);
    console.log('Form data to be written:', formData);

    return new Response(
      JSON.stringify({ 
        message: 'Form response saved successfully',
        config: 'Config processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing form submission:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
