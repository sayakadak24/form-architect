
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, params } = await req.json()

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl || '', supabaseKey || '')

    // Safety checks for the query
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Disallow potentially dangerous operations
    const forbiddenPatterns = [
      /\b(delete|drop|truncate|alter|create|insert|update|grant|revoke)\b/i,
      /;.+/i // Prevent multiple statements
    ]

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(query)) {
        return new Response(
          JSON.stringify({ error: 'Invalid query operation detected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
    }

    // Only allow SELECT statements
    if (!query.trim().toLowerCase().startsWith('select')) {
      return new Response(
        JSON.stringify({ error: 'Only SELECT statements are allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Execute the query with provided parameters
    const { data, error } = await supabase.rpc('run_sql_query', { 
      sql_query: query,
      query_params: params || []
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        hasResults: Array.isArray(data) && data.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
