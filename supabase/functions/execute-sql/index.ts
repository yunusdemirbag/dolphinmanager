// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("SQL execution function started")

serve(async (req) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    // Get the request body
    const { sql } = await req.json()

    if (!sql) {
      return new Response(JSON.stringify({ error: 'SQL query is required' }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Execute the SQL query
    const { data, error } = await supabaseClient.rpc('execute_sql', { sql_query: sql })

    if (error) {
      console.error('SQL execution error:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    // Return the result
    return new Response(JSON.stringify({ data }), { 
      headers: { ...headers, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
}) 