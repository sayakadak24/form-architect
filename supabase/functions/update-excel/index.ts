
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // First, verify that the form exists
    console.log('Fetching form details for formId:', formId);
    const { data: formData1, error: formCheckError } = await supabaseAdmin
      .from('forms')
      .select('*')
      .eq('id', formId)
      .maybeSingle();

    if (formCheckError) {
      console.error('Error checking form existence:', formCheckError);
      throw formCheckError;
    }

    if (!formData1) {
      console.error('Form not found in database:', formId);
      throw new Error(`Form with ID ${formId} not found in database`);
    }

    console.log('Form found:', formData1);

    // Now fetch the user_id specifically
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('user_id')
      .eq('id', formId)
      .maybeSingle();

    if (formError) {
      console.error('Error fetching form:', formError);
      throw formError;
    }

    console.log('Form data retrieved:', form);

    if (!form?.user_id) {
      console.error('Form found but has no user_id. Form data:', form);
      throw new Error('Form has no associated user_id');
    }

    console.log('Fetching admin config for userId:', form.user_id);
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', form.user_id)
      .maybeSingle();

    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      throw adminError;
    }

    if (!adminUser?.id) {
      console.error('Admin user not found for user_id:', form.user_id);
      throw new Error('Admin configuration not found for this user');
    }

    const configPath = `${adminUser.id}/config.json`;
    console.log('Attempting to download config file from path:', configPath);
    
    const { data: configFile, error: configError } = await supabaseAdmin
      .storage
      .from('configs')
      .download(configPath);

    if (configError) {
      console.error('Error downloading config file:', configError);
      throw configError;
    }

    if (!configFile) {
      console.error('Config file not found at path:', configPath);
      throw new Error('Config file not found');
    }

    console.log('Config file downloaded successfully');
    const configText = await configFile.text();
    console.log('Config file contents:', configText);
    
    const config = JSON.parse(configText);
    console.log('Parsed config:', config);

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
